ALTER TABLE public.cost_items
  ADD COLUMN is_standard BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.cost_items.is_standard IS 'Marks permanent standard ingredients that stay available for recipe selection.';