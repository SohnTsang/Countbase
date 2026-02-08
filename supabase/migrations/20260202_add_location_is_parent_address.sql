-- Add is_parent flag and address to locations table
-- is_parent allows marking locations as "parent locations" that can have children
-- address stores the physical address of the location

ALTER TABLE locations ADD COLUMN is_parent BOOLEAN DEFAULT false;
ALTER TABLE locations ADD COLUMN address TEXT;

-- Update existing locations that already have children to be marked as parents
UPDATE locations SET is_parent = true
WHERE id IN (SELECT DISTINCT parent_id FROM locations WHERE parent_id IS NOT NULL);
