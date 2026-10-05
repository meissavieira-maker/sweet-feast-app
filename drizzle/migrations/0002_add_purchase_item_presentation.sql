ALTER TABLE public.cost_purchase_items
  ADD COLUMN presentation TEXT NOT NULL DEFAULT '',
  ADD COLUMN purchase_unit_price NUMERIC(10,2);

ALTER TABLE public.cost_purchase_items
  ADD CONSTRAINT cost_purchase_items_purchase_unit_price_check
  CHECK (purchase_unit_price IS NULL OR purchase_unit_price >= 0);

COMMENT ON COLUMN public.cost_purchase_items.presentation IS 'Original package presentation shown in purchase history, while quantity and unit remain normalized for costing.';
COMMENT ON COLUMN public.cost_purchase_items.purchase_unit_price IS 'Price per original package or commercial unit, when supplied.';