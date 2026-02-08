-- =============================================================================
-- CRITICAL SECURITY FIX: Cross-tenant data isolation
-- =============================================================================
-- Problem: SECURITY DEFINER functions and views owned by postgres (superuser)
-- bypass Row Level Security (RLS), exposing ALL tenants' data to any
-- authenticated user.
--
-- Fix:
-- 1. Recreate all views with security_invoker = true (PostgreSQL 15+)
--    so RLS is evaluated against the calling user, not the view owner.
-- 2. Add WHERE tenant_id = get_user_tenant_id() to all SECURITY DEFINER
--    RPC functions.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. Fix calculated_stock view - add security_invoker
-- -----------------------------------------------------------------------------
DROP VIEW IF EXISTS calculated_stock CASCADE;

CREATE VIEW calculated_stock
WITH (security_invoker = true)
AS
SELECT
    md5(
        COALESCE(sm.product_id::text, '') ||
        COALESCE(sm.location_id::text, '') ||
        COALESCE(sm.lot_number, '') ||
        COALESCE(sm.expiry_date::text, '')
    )::uuid as id,
    sm.tenant_id,
    sm.product_id,
    sm.location_id,
    sm.lot_number,
    sm.expiry_date,
    SUM(sm.qty) as qty_on_hand,
    COALESCE(
        SUM(CASE WHEN sm.qty > 0 AND sm.unit_cost IS NOT NULL THEN sm.qty * sm.unit_cost ELSE 0 END) /
        NULLIF(SUM(CASE WHEN sm.qty > 0 AND sm.unit_cost IS NOT NULL THEN sm.qty ELSE 0 END), 0),
        0
    ) as avg_cost,
    SUM(sm.qty) * COALESCE(
        SUM(CASE WHEN sm.qty > 0 AND sm.unit_cost IS NOT NULL THEN sm.qty * sm.unit_cost ELSE 0 END) /
        NULLIF(SUM(CASE WHEN sm.qty > 0 AND sm.unit_cost IS NOT NULL THEN sm.qty ELSE 0 END), 0),
        0
    ) as inventory_value
FROM stock_movements sm
GROUP BY
    sm.tenant_id,
    sm.product_id,
    sm.location_id,
    sm.lot_number,
    sm.expiry_date
HAVING SUM(sm.qty) > 0;

GRANT SELECT ON calculated_stock TO authenticated;

COMMENT ON VIEW calculated_stock IS 'Calculates current stock levels by aggregating all stock movements. Uses security_invoker to enforce RLS.';


-- -----------------------------------------------------------------------------
-- 2. Fix historical_stock view - add security_invoker
-- -----------------------------------------------------------------------------
DROP VIEW IF EXISTS historical_stock CASCADE;

CREATE VIEW historical_stock
WITH (security_invoker = true)
AS
SELECT
    sm.tenant_id,
    sm.product_id,
    sm.location_id,
    sm.lot_number,
    sm.expiry_date,
    SUM(sm.qty) as qty_on_hand,
    COALESCE(
        SUM(CASE WHEN sm.qty > 0 AND sm.unit_cost IS NOT NULL THEN sm.qty * sm.unit_cost ELSE 0 END) /
        NULLIF(SUM(CASE WHEN sm.qty > 0 AND sm.unit_cost IS NOT NULL THEN sm.qty ELSE 0 END), 0),
        0
    ) as avg_cost,
    0 as inventory_value,
    MAX(sm.created_at) as last_movement_at
FROM stock_movements sm
GROUP BY
    sm.tenant_id,
    sm.product_id,
    sm.location_id,
    sm.lot_number,
    sm.expiry_date
HAVING SUM(sm.qty) = 0;

GRANT SELECT ON historical_stock TO authenticated;

COMMENT ON VIEW historical_stock IS 'Shows depleted stock combinations (qty = 0). Uses security_invoker to enforce RLS.';


-- -----------------------------------------------------------------------------
-- 3. Fix v_low_stock view - add security_invoker
-- -----------------------------------------------------------------------------
DROP VIEW IF EXISTS v_low_stock CASCADE;

CREATE VIEW v_low_stock
WITH (security_invoker = true)
AS
SELECT
    b.tenant_id,
    b.product_id,
    p.sku,
    p.name,
    SUM(b.qty_on_hand) AS total_on_hand,
    p.reorder_point,
    p.reorder_qty
FROM inventory_balances b
JOIN products p ON p.id = b.product_id
WHERE p.active = TRUE
GROUP BY b.tenant_id, b.product_id, p.sku, p.name, p.reorder_point, p.reorder_qty
HAVING SUM(b.qty_on_hand) <= p.reorder_point AND p.reorder_point > 0;

GRANT SELECT ON v_low_stock TO authenticated;

COMMENT ON VIEW v_low_stock IS 'Products below reorder point. Uses security_invoker to enforce RLS.';


-- -----------------------------------------------------------------------------
-- 4. Fix v_expiring_soon view - add security_invoker
-- -----------------------------------------------------------------------------
DROP VIEW IF EXISTS v_expiring_soon CASCADE;

CREATE VIEW v_expiring_soon
WITH (security_invoker = true)
AS
SELECT
    b.tenant_id,
    b.product_id,
    p.sku,
    p.name,
    b.location_id,
    l.name AS location_name,
    b.lot_number,
    b.expiry_date,
    b.qty_on_hand,
    b.expiry_date - CURRENT_DATE AS days_until_expiry
FROM inventory_balances b
JOIN products p ON p.id = b.product_id
JOIN locations l ON l.id = b.location_id
WHERE b.expiry_date IS NOT NULL
    AND b.expiry_date <= CURRENT_DATE + INTERVAL '30 days'
    AND b.qty_on_hand > 0
ORDER BY b.expiry_date ASC;

GRANT SELECT ON v_expiring_soon TO authenticated;

COMMENT ON VIEW v_expiring_soon IS 'Products expiring within 30 days. Uses security_invoker to enforce RLS.';


-- -----------------------------------------------------------------------------
-- 5. Fix get_calculated_stock() RPC - add tenant filter
-- -----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS get_calculated_stock();

CREATE OR REPLACE FUNCTION get_calculated_stock()
RETURNS TABLE (
    id UUID,
    tenant_id UUID,
    product_id UUID,
    location_id UUID,
    lot_number TEXT,
    expiry_date DATE,
    qty_on_hand NUMERIC,
    avg_cost NUMERIC,
    inventory_value NUMERIC,
    product JSONB,
    location JSONB
)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT
        cs.id,
        cs.tenant_id,
        cs.product_id,
        cs.location_id,
        cs.lot_number,
        cs.expiry_date,
        cs.qty_on_hand,
        cs.avg_cost,
        cs.inventory_value,
        jsonb_build_object(
            'id', p.id,
            'sku', p.sku,
            'name', p.name,
            'base_uom', p.base_uom,
            'reorder_point', p.reorder_point,
            'track_expiry', p.track_expiry,
            'track_lot', p.track_lot,
            'category_id', p.category_id
        ) as product,
        jsonb_build_object(
            'id', l.id,
            'name', l.name,
            'type', l.type
        ) as location
    FROM calculated_stock cs
    JOIN products p ON p.id = cs.product_id
    JOIN locations l ON l.id = cs.location_id
    WHERE cs.tenant_id = get_user_tenant_id()
    ORDER BY cs.product_id;
$$;

GRANT EXECUTE ON FUNCTION get_calculated_stock() TO authenticated;


-- -----------------------------------------------------------------------------
-- 6. Fix get_historical_stock() RPC - add tenant filter
-- -----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS get_historical_stock();

CREATE OR REPLACE FUNCTION get_historical_stock()
RETURNS TABLE (
    id UUID,
    tenant_id UUID,
    product_id UUID,
    location_id UUID,
    lot_number TEXT,
    expiry_date DATE,
    qty_on_hand NUMERIC,
    avg_cost NUMERIC,
    inventory_value NUMERIC,
    product JSONB,
    location JSONB
)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT
        md5(
            COALESCE(sm.product_id::text, '') ||
            COALESCE(sm.location_id::text, '') ||
            COALESCE(sm.lot_number, '') ||
            COALESCE(sm.expiry_date::text, '')
        )::uuid as id,
        sm.tenant_id,
        sm.product_id,
        sm.location_id,
        sm.lot_number,
        sm.expiry_date,
        SUM(sm.qty) as qty_on_hand,
        COALESCE(
            SUM(CASE WHEN sm.qty > 0 AND sm.unit_cost IS NOT NULL THEN sm.qty * sm.unit_cost ELSE 0 END) /
            NULLIF(SUM(CASE WHEN sm.qty > 0 AND sm.unit_cost IS NOT NULL THEN sm.qty ELSE 0 END), 0),
            0
        ) as avg_cost,
        0::numeric as inventory_value,
        jsonb_build_object(
            'id', p.id,
            'sku', p.sku,
            'name', p.name,
            'base_uom', p.base_uom,
            'reorder_point', p.reorder_point,
            'track_expiry', p.track_expiry,
            'track_lot', p.track_lot
        ) as product,
        jsonb_build_object(
            'id', l.id,
            'name', l.name,
            'type', l.type
        ) as location
    FROM stock_movements sm
    JOIN products p ON p.id = sm.product_id
    JOIN locations l ON l.id = sm.location_id
    WHERE sm.tenant_id = get_user_tenant_id()
    GROUP BY
        sm.tenant_id,
        sm.product_id,
        sm.location_id,
        sm.lot_number,
        sm.expiry_date,
        p.id, p.sku, p.name, p.base_uom, p.reorder_point, p.track_expiry, p.track_lot,
        l.id, l.name, l.type
    HAVING SUM(sm.qty) = 0
    ORDER BY sm.product_id;
$$;

GRANT EXECUTE ON FUNCTION get_historical_stock() TO authenticated;


-- -----------------------------------------------------------------------------
-- 7. Fix get_stock_at_location() RPC - add tenant filter
-- -----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS get_stock_at_location(UUID);

CREATE OR REPLACE FUNCTION get_stock_at_location(p_location_id UUID)
RETURNS TABLE (
    id UUID,
    product_id UUID,
    location_id UUID,
    lot_number TEXT,
    expiry_date DATE,
    qty_on_hand NUMERIC,
    avg_cost NUMERIC
)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT
        cs.id,
        cs.product_id,
        cs.location_id,
        cs.lot_number,
        cs.expiry_date,
        cs.qty_on_hand,
        cs.avg_cost
    FROM calculated_stock cs
    WHERE cs.location_id = p_location_id
      AND cs.tenant_id = get_user_tenant_id()
    ORDER BY cs.product_id;
$$;

GRANT EXECUTE ON FUNCTION get_stock_at_location(UUID) TO authenticated;
