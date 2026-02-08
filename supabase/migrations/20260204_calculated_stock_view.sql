-- Create a view that calculates current stock from stock_movements
-- This is the source of truth for inventory quantities

CREATE OR REPLACE VIEW calculated_stock AS
SELECT
    sm.tenant_id,
    sm.product_id,
    sm.location_id,
    sm.lot_number,
    sm.expiry_date,
    SUM(sm.qty) as qty_on_hand,
    -- Calculate weighted average cost from incoming (positive) movements
    COALESCE(
        SUM(CASE WHEN sm.qty > 0 AND sm.unit_cost IS NOT NULL THEN sm.qty * sm.unit_cost ELSE 0 END) /
        NULLIF(SUM(CASE WHEN sm.qty > 0 AND sm.unit_cost IS NOT NULL THEN sm.qty ELSE 0 END), 0),
        0
    ) as avg_cost,
    -- Calculated inventory value
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

-- Create index on stock_movements for efficient view queries
CREATE INDEX IF NOT EXISTS idx_movements_calc_stock
ON stock_movements(tenant_id, product_id, location_id, lot_number, expiry_date);

-- Grant permissions for the view
GRANT SELECT ON calculated_stock TO authenticated;

COMMENT ON VIEW calculated_stock IS 'Calculates current stock levels by aggregating all stock movements. This is the source of truth for inventory quantities.';

-- Create RPC function to get calculated stock with product and location details
CREATE OR REPLACE FUNCTION get_calculated_stock()
RETURNS TABLE (
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
            'track_lot', p.track_lot
        ) as product,
        jsonb_build_object(
            'id', l.id,
            'name', l.name,
            'type', l.type
        ) as location
    FROM calculated_stock cs
    JOIN products p ON p.id = cs.product_id
    JOIN locations l ON l.id = cs.location_id
    ORDER BY cs.product_id;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_calculated_stock() TO authenticated;

-- Create function to get stock for a specific location (used in forms)
CREATE OR REPLACE FUNCTION get_stock_at_location(p_location_id UUID)
RETURNS TABLE (
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
        cs.product_id,
        cs.location_id,
        cs.lot_number,
        cs.expiry_date,
        cs.qty_on_hand,
        cs.avg_cost
    FROM calculated_stock cs
    WHERE cs.location_id = p_location_id
    ORDER BY cs.product_id;
$$;

GRANT EXECUTE ON FUNCTION get_stock_at_location(UUID) TO authenticated;
