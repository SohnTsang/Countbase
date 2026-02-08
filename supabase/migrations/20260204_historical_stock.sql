-- Create a view for historical/depleted stock (qty = 0)
-- These are product+location+lot combinations that once had stock but are now fully consumed

CREATE OR REPLACE VIEW historical_stock AS
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

COMMENT ON VIEW historical_stock IS 'Shows product+location+lot combinations that once had stock but are now fully depleted (qty = 0).';

-- Create RPC function to get historical/depleted stock with product and location details
CREATE OR REPLACE FUNCTION get_historical_stock()
RETURNS TABLE (
    tenant_id UUID,
    product_id UUID,
    location_id UUID,
    lot_number TEXT,
    expiry_date DATE,
    qty_on_hand NUMERIC,
    avg_cost NUMERIC,
    inventory_value NUMERIC,
    last_movement_at TIMESTAMPTZ,
    product JSONB,
    location JSONB
)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT
        hs.tenant_id,
        hs.product_id,
        hs.location_id,
        hs.lot_number,
        hs.expiry_date,
        hs.qty_on_hand,
        hs.avg_cost,
        hs.inventory_value,
        hs.last_movement_at,
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
    FROM historical_stock hs
    JOIN products p ON p.id = hs.product_id
    JOIN locations l ON l.id = hs.location_id
    ORDER BY hs.last_movement_at DESC;
$$;

GRANT EXECUTE ON FUNCTION get_historical_stock() TO authenticated;
