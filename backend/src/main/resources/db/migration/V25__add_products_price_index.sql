-- Improve aggregation/filter performance for product price range API and price-based product filters
CREATE INDEX IF NOT EXISTS idx_products_price ON products(price);

