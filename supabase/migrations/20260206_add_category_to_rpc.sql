-- Update get_calculated_stock function to include category_id in product JSONB
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
    ORDER BY cs.product_id;
$$;
