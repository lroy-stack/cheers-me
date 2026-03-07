-- Add invoice_number column to gift_coupons for factura simplificada numbering
-- Using a sequence for sequential, gap-free invoice numbers
CREATE SEQUENCE IF NOT EXISTS coupon_invoice_seq START 1;

ALTER TABLE gift_coupons 
  ADD COLUMN IF NOT EXISTS invoice_number TEXT UNIQUE;
