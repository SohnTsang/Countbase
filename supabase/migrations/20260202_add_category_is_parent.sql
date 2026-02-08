-- Add is_parent flag to categories table
-- This allows marking categories as "parent categories" that can have children

ALTER TABLE categories ADD COLUMN is_parent BOOLEAN DEFAULT false;

-- Update existing categories that already have children to be marked as parents
UPDATE categories SET is_parent = true
WHERE id IN (SELECT DISTINCT parent_id FROM categories WHERE parent_id IS NOT NULL);
