-- ===========================================
-- STEP 1: DROP EVERYTHING FIRST
-- ===========================================

-- Drop views first
DROP VIEW IF EXISTS v_expiring_soon CASCADE;
DROP VIEW IF EXISTS v_low_stock CASCADE;
DROP VIEW IF EXISTS v_stock_summary CASCADE;
DROP VIEW IF EXISTS v_stock_from_movements CASCADE;

-- Drop tables (order matters due to foreign keys)
DROP TABLE IF EXISTS return_lines CASCADE;
DROP TABLE IF EXISTS returns CASCADE;
DROP TABLE IF EXISTS cycle_count_lines CASCADE;
DROP TABLE IF EXISTS cycle_counts CASCADE;
DROP TABLE IF EXISTS adjustment_lines CASCADE;
DROP TABLE IF EXISTS adjustments CASCADE;
DROP TABLE IF EXISTS transfer_lines CASCADE;
DROP TABLE IF EXISTS transfers CASCADE;
DROP TABLE IF EXISTS shipment_lines CASCADE;
DROP TABLE IF EXISTS shipments CASCADE;
DROP TABLE IF EXISTS purchase_order_lines CASCADE;
DROP TABLE IF EXISTS purchase_orders CASCADE;
DROP TABLE IF EXISTS reservations CASCADE;
DROP TABLE IF EXISTS stock_movements CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS doc_sequences CASCADE;
DROP TABLE IF EXISTS inventory_balances CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS suppliers CASCADE;
DROP TABLE IF EXISTS locations CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS tenants CASCADE;

-- Drop types
DROP TYPE IF EXISTS reservation_status CASCADE;
DROP TYPE IF EXISTS base_uom CASCADE;
DROP TYPE IF EXISTS adjustment_reason CASCADE;
DROP TYPE IF EXISTS movement_type CASCADE;
DROP TYPE IF EXISTS document_status CASCADE;
DROP TYPE IF EXISTS location_type CASCADE;
DROP TYPE IF EXISTS user_role CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS get_user_tenant_id() CASCADE;
DROP FUNCTION IF EXISTS get_user_role() CASCADE;
DROP FUNCTION IF EXISTS next_doc_number(UUID, TEXT) CASCADE;
DROP FUNCTION IF EXISTS update_inventory_on_receive(UUID, UUID, UUID, NUMERIC, NUMERIC, TEXT, DATE) CASCADE;
DROP FUNCTION IF EXISTS update_inventory_on_out(UUID, UUID, UUID, NUMERIC, TEXT, DATE) CASCADE;
DROP FUNCTION IF EXISTS get_fefo_allocation(UUID, UUID, UUID, NUMERIC) CASCADE;
DROP FUNCTION IF EXISTS release_expired_reservations() CASCADE;

-- ===========================================
-- STEP 2: CREATE EXTENSIONS & ENUMS
-- ===========================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TYPE user_role AS ENUM ('admin', 'manager', 'staff', 'readonly');
CREATE TYPE location_type AS ENUM ('warehouse', 'store', 'outlet');
CREATE TYPE document_status AS ENUM ('draft', 'confirmed', 'partial', 'completed', 'cancelled');
CREATE TYPE movement_type AS ENUM (
  'receive', 'ship', 'transfer_out', 'transfer_in',
  'adjustment', 'count_variance', 'return_in', 'return_out', 'void'
);
CREATE TYPE adjustment_reason AS ENUM (
  'damage', 'shrinkage', 'expiry', 'correction', 'sample', 'count_variance', 'other'
);
CREATE TYPE base_uom AS ENUM ('EA', 'KG', 'G', 'L', 'ML', 'M', 'CM', 'BOX', 'PACK');
CREATE TYPE reservation_status AS ENUM ('active', 'released', 'consumed');

-- ===========================================
-- STEP 3: CREATE CORE TABLES
-- ===========================================

CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  settings JSONB DEFAULT '{"reservation_expiry_hours": 48, "require_adjustment_approval": true, "default_currency": "USD"}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'staff',
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, email)
);

CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  name TEXT NOT NULL,
  parent_id UUID REFERENCES categories(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, name)
);

CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  sku TEXT NOT NULL,
  name TEXT NOT NULL,
  barcode TEXT,
  category_id UUID REFERENCES categories(id),
  base_uom base_uom NOT NULL DEFAULT 'EA',
  pack_uom_name TEXT,
  pack_qty_in_base NUMERIC(12,4),
  allow_decimal_qty BOOLEAN GENERATED ALWAYS AS (base_uom IN ('KG', 'G', 'L', 'ML', 'M', 'CM')) STORED,
  current_cost NUMERIC(12,4) DEFAULT 0,
  track_expiry BOOLEAN DEFAULT FALSE,
  track_lot BOOLEAN DEFAULT FALSE,
  reorder_point NUMERIC(12,4) DEFAULT 0,
  reorder_qty NUMERIC(12,4) DEFAULT 0,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, sku),
  CONSTRAINT valid_pack CHECK (
    (pack_uom_name IS NULL AND pack_qty_in_base IS NULL) OR
    (pack_uom_name IS NOT NULL AND pack_qty_in_base IS NOT NULL AND pack_qty_in_base > 0)
  )
);

CREATE TABLE locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  name TEXT NOT NULL,
  type location_type NOT NULL,
  parent_id UUID REFERENCES locations(id),
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, name)
);

CREATE TABLE suppliers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  code TEXT,
  name TEXT NOT NULL,
  contact_name TEXT,
  email TEXT,
  phone TEXT,
  address JSONB DEFAULT '{}',
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, code)
);

CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  code TEXT,
  name TEXT NOT NULL,
  contact_name TEXT,
  email TEXT,
  phone TEXT,
  address JSONB DEFAULT '{}',
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE inventory_balances (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  product_id UUID NOT NULL REFERENCES products(id),
  location_id UUID NOT NULL REFERENCES locations(id),
  lot_number TEXT,
  expiry_date DATE,
  qty_on_hand NUMERIC(12,4) NOT NULL DEFAULT 0,
  avg_cost NUMERIC(12,4) NOT NULL DEFAULT 0,
  inventory_value NUMERIC(14,4) GENERATED ALWAYS AS (qty_on_hand * avg_cost) STORED,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_balance_with_lot ON inventory_balances(tenant_id, product_id, location_id, lot_number, expiry_date)
  WHERE lot_number IS NOT NULL OR expiry_date IS NOT NULL;
CREATE UNIQUE INDEX idx_balance_no_lot ON inventory_balances(tenant_id, product_id, location_id)
  WHERE lot_number IS NULL AND expiry_date IS NULL;

CREATE TABLE purchase_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  po_number TEXT NOT NULL,
  supplier_id UUID NOT NULL REFERENCES suppliers(id),
  location_id UUID NOT NULL REFERENCES locations(id),
  status document_status DEFAULT 'draft',
  order_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expected_date DATE,
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, po_number)
);

CREATE TABLE purchase_order_lines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  po_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  qty_ordered NUMERIC(12,4) NOT NULL,
  qty_received NUMERIC(12,4) DEFAULT 0,
  unit_cost NUMERIC(12,4) NOT NULL,
  UNIQUE(po_id, product_id)
);

CREATE TABLE shipments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  shipment_number TEXT NOT NULL,
  location_id UUID NOT NULL REFERENCES locations(id),
  customer_id UUID REFERENCES customers(id),
  customer_name TEXT,
  status document_status DEFAULT 'draft',
  ship_date DATE,
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, shipment_number)
);

CREATE TABLE shipment_lines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shipment_id UUID NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  qty NUMERIC(12,4) NOT NULL,
  lot_number TEXT,
  expiry_date DATE,
  unit_cost NUMERIC(12,4)
);

CREATE TABLE transfers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  transfer_number TEXT NOT NULL,
  from_location_id UUID NOT NULL REFERENCES locations(id),
  to_location_id UUID NOT NULL REFERENCES locations(id),
  status document_status DEFAULT 'draft',
  sent_at TIMESTAMPTZ,
  received_at TIMESTAMPTZ,
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, transfer_number)
);

CREATE TABLE transfer_lines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transfer_id UUID NOT NULL REFERENCES transfers(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  qty NUMERIC(12,4) NOT NULL,
  lot_number TEXT,
  expiry_date DATE,
  unit_cost NUMERIC(12,4)
);

CREATE TABLE adjustments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  adjustment_number TEXT NOT NULL,
  location_id UUID NOT NULL REFERENCES locations(id),
  reason adjustment_reason NOT NULL,
  status document_status DEFAULT 'draft',
  notes TEXT,
  created_by UUID REFERENCES users(id),
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, adjustment_number)
);

CREATE TABLE adjustment_lines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  adjustment_id UUID NOT NULL REFERENCES adjustments(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  qty NUMERIC(12,4) NOT NULL,
  lot_number TEXT,
  expiry_date DATE,
  unit_cost NUMERIC(12,4)
);

CREATE TABLE cycle_counts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  count_number TEXT NOT NULL,
  location_id UUID NOT NULL REFERENCES locations(id),
  status document_status DEFAULT 'draft',
  count_date DATE DEFAULT CURRENT_DATE,
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, count_number)
);

CREATE TABLE cycle_count_lines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  count_id UUID NOT NULL REFERENCES cycle_counts(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  system_qty NUMERIC(12,4) NOT NULL,
  counted_qty NUMERIC(12,4),
  variance NUMERIC(12,4) GENERATED ALWAYS AS (COALESCE(counted_qty, 0) - system_qty) STORED,
  lot_number TEXT,
  expiry_date DATE
);

CREATE TABLE returns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  return_number TEXT NOT NULL,
  return_type TEXT NOT NULL CHECK (return_type IN ('customer', 'supplier')),
  location_id UUID NOT NULL REFERENCES locations(id),
  partner_id UUID,
  partner_name TEXT,
  status document_status DEFAULT 'draft',
  reason TEXT,
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, return_number)
);

CREATE TABLE return_lines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  return_id UUID NOT NULL REFERENCES returns(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  qty NUMERIC(12,4) NOT NULL,
  lot_number TEXT,
  expiry_date DATE,
  unit_cost NUMERIC(12,4)
);

CREATE TABLE stock_movements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  product_id UUID NOT NULL REFERENCES products(id),
  location_id UUID NOT NULL REFERENCES locations(id),
  qty NUMERIC(12,4) NOT NULL,
  movement_type movement_type NOT NULL,
  reference_type TEXT,
  reference_id UUID,
  lot_number TEXT,
  expiry_date DATE,
  unit_cost NUMERIC(12,4),
  extended_cost NUMERIC(14,4) GENERATED ALWAYS AS (ABS(qty) * COALESCE(unit_cost, 0)) STORED,
  reason adjustment_reason,
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_movements_stock ON stock_movements(tenant_id, product_id, location_id);
CREATE INDEX idx_movements_ref ON stock_movements(reference_type, reference_id);
CREATE INDEX idx_movements_expiry ON stock_movements(tenant_id, expiry_date) WHERE expiry_date IS NOT NULL;
CREATE INDEX idx_movements_created ON stock_movements(tenant_id, created_at DESC);

CREATE TABLE reservations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  shipment_id UUID NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  location_id UUID NOT NULL REFERENCES locations(id),
  qty NUMERIC(12,4) NOT NULL,
  lot_number TEXT,
  expiry_date DATE,
  status reservation_status DEFAULT 'active',
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_reservations_active ON reservations(tenant_id, product_id, location_id) WHERE status = 'active';

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  action TEXT NOT NULL,
  changes JSONB,
  user_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_entity ON audit_logs(tenant_id, entity_type, entity_id);
CREATE INDEX idx_audit_time ON audit_logs(tenant_id, created_at DESC);

CREATE TABLE doc_sequences (
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  doc_type TEXT NOT NULL,
  year INTEGER NOT NULL,
  last_number INTEGER DEFAULT 0,
  PRIMARY KEY (tenant_id, doc_type, year)
);

-- ===========================================
-- STEP 4: CREATE VIEWS
-- ===========================================

CREATE OR REPLACE VIEW v_stock_from_movements AS
SELECT tenant_id, product_id, location_id, lot_number, expiry_date, SUM(qty) AS qty_on_hand
FROM stock_movements
GROUP BY tenant_id, product_id, location_id, lot_number, expiry_date
HAVING SUM(qty) != 0;

CREATE OR REPLACE VIEW v_stock_summary AS
SELECT
  b.tenant_id, b.product_id, p.sku, p.name AS product_name, p.base_uom,
  b.location_id, l.name AS location_name, b.lot_number, b.expiry_date,
  b.qty_on_hand, b.avg_cost, b.inventory_value,
  COALESCE(r.reserved_qty, 0) AS reserved,
  b.qty_on_hand - COALESCE(r.reserved_qty, 0) AS available
FROM inventory_balances b
JOIN products p ON p.id = b.product_id
JOIN locations l ON l.id = b.location_id
LEFT JOIN (
  SELECT tenant_id, product_id, location_id,
         COALESCE(lot_number, '') as lot_number,
         COALESCE(expiry_date, '1900-01-01'::date) as expiry_date,
         SUM(qty) AS reserved_qty
  FROM reservations WHERE status = 'active'
  GROUP BY tenant_id, product_id, location_id, lot_number, expiry_date
) r ON b.tenant_id = r.tenant_id AND b.product_id = r.product_id AND b.location_id = r.location_id
   AND COALESCE(b.lot_number, '') = r.lot_number
   AND COALESCE(b.expiry_date, '1900-01-01'::date) = r.expiry_date;

CREATE OR REPLACE VIEW v_low_stock AS
SELECT b.tenant_id, b.product_id, p.sku, p.name, SUM(b.qty_on_hand) AS total_on_hand, p.reorder_point, p.reorder_qty
FROM inventory_balances b
JOIN products p ON p.id = b.product_id
WHERE p.active = TRUE
GROUP BY b.tenant_id, b.product_id, p.sku, p.name, p.reorder_point, p.reorder_qty
HAVING SUM(b.qty_on_hand) <= p.reorder_point AND p.reorder_point > 0;

CREATE OR REPLACE VIEW v_expiring_soon AS
SELECT b.tenant_id, b.product_id, p.sku, p.name, b.location_id, l.name AS location_name,
  b.lot_number, b.expiry_date, b.qty_on_hand, b.expiry_date - CURRENT_DATE AS days_until_expiry
FROM inventory_balances b
JOIN products p ON p.id = b.product_id
JOIN locations l ON l.id = b.location_id
WHERE b.expiry_date IS NOT NULL AND b.expiry_date <= CURRENT_DATE + INTERVAL '30 days' AND b.qty_on_hand > 0
ORDER BY b.expiry_date ASC;

-- ===========================================
-- STEP 5: CREATE FUNCTIONS
-- ===========================================

CREATE OR REPLACE FUNCTION next_doc_number(p_tenant_id UUID, p_doc_type TEXT) RETURNS TEXT AS $$
DECLARE
  v_year INTEGER := EXTRACT(YEAR FROM CURRENT_DATE);
  v_num INTEGER;
BEGIN
  INSERT INTO doc_sequences (tenant_id, doc_type, year, last_number)
  VALUES (p_tenant_id, p_doc_type, v_year, 1)
  ON CONFLICT (tenant_id, doc_type, year)
  DO UPDATE SET last_number = doc_sequences.last_number + 1
  RETURNING last_number INTO v_num;
  RETURN p_doc_type || '-' || v_year || '-' || LPAD(v_num::TEXT, 5, '0');
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_inventory_on_receive(
  p_tenant_id UUID, p_product_id UUID, p_location_id UUID,
  p_qty NUMERIC, p_unit_cost NUMERIC, p_lot_number TEXT DEFAULT NULL, p_expiry_date DATE DEFAULT NULL
) RETURNS void AS $$
DECLARE
  v_current_qty NUMERIC; v_current_cost NUMERIC; v_new_qty NUMERIC; v_new_cost NUMERIC;
BEGIN
  SELECT qty_on_hand, avg_cost INTO v_current_qty, v_current_cost
  FROM inventory_balances
  WHERE tenant_id = p_tenant_id AND product_id = p_product_id AND location_id = p_location_id
    AND COALESCE(lot_number, '') = COALESCE(p_lot_number, '')
    AND COALESCE(expiry_date, '1900-01-01'::date) = COALESCE(p_expiry_date, '1900-01-01'::date);
  IF NOT FOUND THEN v_current_qty := 0; v_current_cost := 0; END IF;
  v_new_qty := v_current_qty + p_qty;
  IF v_new_qty > 0 THEN v_new_cost := ((v_current_qty * v_current_cost) + (p_qty * p_unit_cost)) / v_new_qty;
  ELSE v_new_cost := p_unit_cost; END IF;
  INSERT INTO inventory_balances (tenant_id, product_id, location_id, lot_number, expiry_date, qty_on_hand, avg_cost)
  VALUES (p_tenant_id, p_product_id, p_location_id, p_lot_number, p_expiry_date, v_new_qty, v_new_cost)
  ON CONFLICT (tenant_id, product_id, location_id) WHERE lot_number IS NULL AND expiry_date IS NULL
  DO UPDATE SET qty_on_hand = v_new_qty, avg_cost = v_new_cost, updated_at = NOW();
  UPDATE products SET current_cost = v_new_cost, updated_at = NOW() WHERE id = p_product_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_inventory_on_out(
  p_tenant_id UUID, p_product_id UUID, p_location_id UUID,
  p_qty NUMERIC, p_lot_number TEXT DEFAULT NULL, p_expiry_date DATE DEFAULT NULL
) RETURNS NUMERIC AS $$
DECLARE v_current_qty NUMERIC; v_current_cost NUMERIC;
BEGIN
  SELECT qty_on_hand, avg_cost INTO v_current_qty, v_current_cost
  FROM inventory_balances
  WHERE tenant_id = p_tenant_id AND product_id = p_product_id AND location_id = p_location_id
    AND COALESCE(lot_number, '') = COALESCE(p_lot_number, '')
    AND COALESCE(expiry_date, '1900-01-01'::date) = COALESCE(p_expiry_date, '1900-01-01'::date);
  IF NOT FOUND OR v_current_qty < p_qty THEN
    RAISE EXCEPTION 'Insufficient stock: have %, need %', COALESCE(v_current_qty, 0), p_qty;
  END IF;
  UPDATE inventory_balances SET qty_on_hand = qty_on_hand - p_qty, updated_at = NOW()
  WHERE tenant_id = p_tenant_id AND product_id = p_product_id AND location_id = p_location_id
    AND COALESCE(lot_number, '') = COALESCE(p_lot_number, '')
    AND COALESCE(expiry_date, '1900-01-01'::date) = COALESCE(p_expiry_date, '1900-01-01'::date);
  RETURN v_current_cost;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION release_expired_reservations() RETURNS INTEGER AS $$
DECLARE v_count INTEGER;
BEGIN
  UPDATE reservations SET status = 'released' WHERE status = 'active' AND expires_at < NOW();
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- ===========================================
-- STEP 6: ENABLE RLS
-- ===========================================

ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipment_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE transfer_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE adjustment_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE cycle_counts ENABLE ROW LEVEL SECURITY;
ALTER TABLE cycle_count_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE return_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE doc_sequences ENABLE ROW LEVEL SECURITY;

-- ===========================================
-- STEP 7: CREATE HELPER FUNCTIONS
-- ===========================================

CREATE OR REPLACE FUNCTION get_user_tenant_id() RETURNS UUID AS $$
  SELECT tenant_id FROM users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION get_user_role() RETURNS user_role AS $$
  SELECT role FROM users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ===========================================
-- STEP 8: CREATE RLS POLICIES
-- ===========================================

-- TENANTS: Allow authenticated users to INSERT (for signup)
CREATE POLICY tenants_insert ON tenants FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY tenants_select ON tenants FOR SELECT USING (id = get_user_tenant_id());
CREATE POLICY tenants_update ON tenants FOR UPDATE USING (id = get_user_tenant_id());
CREATE POLICY tenants_delete ON tenants FOR DELETE USING (id = get_user_tenant_id());

-- USERS: Allow users to INSERT their own profile (for signup)
CREATE POLICY users_insert ON users FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY users_select ON users FOR SELECT USING (tenant_id = get_user_tenant_id());
CREATE POLICY users_update ON users FOR UPDATE USING (tenant_id = get_user_tenant_id());
CREATE POLICY users_delete ON users FOR DELETE USING (tenant_id = get_user_tenant_id());

-- ALL OTHER TABLES: Standard tenant isolation
CREATE POLICY tenant_isolation ON categories FOR ALL USING (tenant_id = get_user_tenant_id());
CREATE POLICY tenant_isolation ON products FOR ALL USING (tenant_id = get_user_tenant_id());
CREATE POLICY tenant_isolation ON locations FOR ALL USING (tenant_id = get_user_tenant_id());
CREATE POLICY tenant_isolation ON suppliers FOR ALL USING (tenant_id = get_user_tenant_id());
CREATE POLICY tenant_isolation ON customers FOR ALL USING (tenant_id = get_user_tenant_id());
CREATE POLICY tenant_isolation ON inventory_balances FOR ALL USING (tenant_id = get_user_tenant_id());
CREATE POLICY tenant_isolation ON purchase_orders FOR ALL USING (tenant_id = get_user_tenant_id());
CREATE POLICY tenant_isolation ON purchase_order_lines FOR ALL USING (
  po_id IN (SELECT id FROM purchase_orders WHERE tenant_id = get_user_tenant_id())
);
CREATE POLICY tenant_isolation ON shipments FOR ALL USING (tenant_id = get_user_tenant_id());
CREATE POLICY tenant_isolation ON shipment_lines FOR ALL USING (
  shipment_id IN (SELECT id FROM shipments WHERE tenant_id = get_user_tenant_id())
);
CREATE POLICY tenant_isolation ON transfers FOR ALL USING (tenant_id = get_user_tenant_id());
CREATE POLICY tenant_isolation ON transfer_lines FOR ALL USING (
  transfer_id IN (SELECT id FROM transfers WHERE tenant_id = get_user_tenant_id())
);
CREATE POLICY tenant_isolation ON adjustments FOR ALL USING (tenant_id = get_user_tenant_id());
CREATE POLICY tenant_isolation ON adjustment_lines FOR ALL USING (
  adjustment_id IN (SELECT id FROM adjustments WHERE tenant_id = get_user_tenant_id())
);
CREATE POLICY tenant_isolation ON cycle_counts FOR ALL USING (tenant_id = get_user_tenant_id());
CREATE POLICY tenant_isolation ON cycle_count_lines FOR ALL USING (
  count_id IN (SELECT id FROM cycle_counts WHERE tenant_id = get_user_tenant_id())
);
CREATE POLICY tenant_isolation ON returns FOR ALL USING (tenant_id = get_user_tenant_id());
CREATE POLICY tenant_isolation ON return_lines FOR ALL USING (
  return_id IN (SELECT id FROM returns WHERE tenant_id = get_user_tenant_id())
);
CREATE POLICY tenant_isolation ON stock_movements FOR ALL USING (tenant_id = get_user_tenant_id());
CREATE POLICY tenant_isolation ON reservations FOR ALL USING (tenant_id = get_user_tenant_id());
CREATE POLICY tenant_isolation ON audit_logs FOR ALL USING (tenant_id = get_user_tenant_id());
CREATE POLICY tenant_isolation ON doc_sequences FOR ALL USING (tenant_id = get_user_tenant_id());

-- ===========================================
-- DONE! Schema created successfully.
-- ===========================================
