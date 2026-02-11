-- 040: Add is_featured flag to menu_items
-- Allows marking items as featured for the public landing page carousel

ALTER TABLE menu_items ADD COLUMN is_featured BOOLEAN NOT NULL DEFAULT false;

-- Index for efficient lookups
CREATE INDEX idx_menu_items_featured ON menu_items (is_featured) WHERE is_featured = true;
