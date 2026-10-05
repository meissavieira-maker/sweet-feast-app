CREATE TABLE public.cost_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'ingrediente' CHECK (kind IN ('ingrediente', 'embalagem')),
  base_unit TEXT NOT NULL CHECK (base_unit IN ('g', 'ml', 'un')),
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (name, kind)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cost_items TO authenticated;
GRANT ALL ON public.cost_items TO service_role;
ALTER TABLE public.cost_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage cost items" ON public.cost_items FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER cost_items_updated_at BEFORE UPDATE ON public.cost_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.cost_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_date DATE NOT NULL DEFAULT CURRENT_DATE,
  supplier TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  created_by UUID DEFAULT auth.uid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cost_purchases TO authenticated;
GRANT ALL ON public.cost_purchases TO service_role;
ALTER TABLE public.cost_purchases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage cost purchases" ON public.cost_purchases FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER cost_purchases_updated_at BEFORE UPDATE ON public.cost_purchases FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.cost_purchase_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id UUID NOT NULL REFERENCES public.cost_purchases(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.cost_items(id) ON DELETE RESTRICT,
  quantity NUMERIC(14,3) NOT NULL CHECK (quantity > 0),
  unit TEXT NOT NULL CHECK (unit IN ('kg', 'g', 'l', 'ml', 'un')),
  total_cost NUMERIC(14,2) NOT NULL CHECK (total_cost >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cost_purchase_items TO authenticated;
GRANT ALL ON public.cost_purchase_items TO service_role;
ALTER TABLE public.cost_purchase_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage cost purchase items" ON public.cost_purchase_items FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.cost_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  amount NUMERIC(14,2) NOT NULL CHECK (amount >= 0),
  notes TEXT NOT NULL DEFAULT '',
  created_by UUID DEFAULT auth.uid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cost_expenses TO authenticated;
GRANT ALL ON public.cost_expenses TO service_role;
ALTER TABLE public.cost_expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage cost expenses" ON public.cost_expenses FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER cost_expenses_updated_at BEFORE UPDATE ON public.cost_expenses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.cost_recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  yield_quantity NUMERIC(14,3) NOT NULL DEFAULT 1 CHECK (yield_quantity > 0),
  yield_label TEXT NOT NULL DEFAULT 'unidades',
  labor_cost NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (labor_cost >= 0),
  overhead_percent NUMERIC(7,3) NOT NULL DEFAULT 0 CHECK (overhead_percent >= 0 AND overhead_percent <= 1000),
  notes TEXT NOT NULL DEFAULT '',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cost_recipes TO authenticated;
GRANT ALL ON public.cost_recipes TO service_role;
ALTER TABLE public.cost_recipes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage cost recipes" ON public.cost_recipes FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER cost_recipes_updated_at BEFORE UPDATE ON public.cost_recipes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.cost_recipe_components (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID NOT NULL REFERENCES public.cost_recipes(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.cost_items(id) ON DELETE RESTRICT,
  quantity NUMERIC(14,3) NOT NULL CHECK (quantity > 0),
  unit TEXT NOT NULL CHECK (unit IN ('kg', 'g', 'l', 'ml', 'un')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (recipe_id, item_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cost_recipe_components TO authenticated;
GRANT ALL ON public.cost_recipe_components TO service_role;
ALTER TABLE public.cost_recipe_components ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage cost recipe components" ON public.cost_recipe_components FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_cost_purchases_date ON public.cost_purchases(purchase_date DESC);
CREATE INDEX idx_cost_purchase_items_purchase ON public.cost_purchase_items(purchase_id);
CREATE INDEX idx_cost_purchase_items_item ON public.cost_purchase_items(item_id);
CREATE INDEX idx_cost_expenses_date ON public.cost_expenses(expense_date DESC);
CREATE INDEX idx_cost_recipes_product ON public.cost_recipes(product_id);
CREATE INDEX idx_cost_recipe_components_recipe ON public.cost_recipe_components(recipe_id);

CREATE VIEW public.cost_item_prices WITH (security_invoker = true) AS
SELECT
  ci.id,
  ci.name,
  ci.kind,
  ci.base_unit,
  ci.active,
  COALESCE(
    SUM(cpi.total_cost) / NULLIF(SUM(
      CASE cpi.unit
        WHEN 'kg' THEN cpi.quantity * 1000
        WHEN 'l' THEN cpi.quantity * 1000
        ELSE cpi.quantity
      END
    ), 0),
    0
  )::NUMERIC(18,6) AS unit_cost,
  COALESCE(SUM(cpi.total_cost), 0)::NUMERIC(18,2) AS purchased_total
FROM public.cost_items ci
LEFT JOIN public.cost_purchase_items cpi ON cpi.item_id = ci.id
GROUP BY ci.id, ci.name, ci.kind, ci.base_unit, ci.active;
GRANT SELECT ON public.cost_item_prices TO authenticated;
GRANT ALL ON public.cost_item_prices TO service_role;

CREATE VIEW public.cost_recipe_summary WITH (security_invoker = true) AS
WITH component_costs AS (
  SELECT
    crc.recipe_id,
    SUM(
      CASE crc.unit
        WHEN 'kg' THEN crc.quantity * 1000
        WHEN 'l' THEN crc.quantity * 1000
        ELSE crc.quantity
      END * cip.unit_cost
    ) AS component_cost,
    COUNT(*) FILTER (WHERE cip.unit_cost = 0) AS unpriced_items
  FROM public.cost_recipe_components crc
  JOIN public.cost_item_prices cip ON cip.id = crc.item_id
  GROUP BY crc.recipe_id
)
SELECT
  cr.id,
  cr.name,
  cr.product_id,
  p.name AS product_name,
  p.price AS sale_price,
  cr.yield_quantity,
  cr.yield_label,
  cr.labor_cost,
  cr.overhead_percent,
  cr.active,
  COALESCE(cc.component_cost, 0)::NUMERIC(18,2) AS component_cost,
  (COALESCE(cc.component_cost, 0) + cr.labor_cost)::NUMERIC(18,2) AS direct_cost,
  ((COALESCE(cc.component_cost, 0) + cr.labor_cost) * (1 + cr.overhead_percent / 100))::NUMERIC(18,2) AS total_cost,
  (((COALESCE(cc.component_cost, 0) + cr.labor_cost) * (1 + cr.overhead_percent / 100)) / cr.yield_quantity)::NUMERIC(18,4) AS unit_cost,
  CASE WHEN p.price IS NULL THEN NULL ELSE (p.price - (((COALESCE(cc.component_cost, 0) + cr.labor_cost) * (1 + cr.overhead_percent / 100)) / cr.yield_quantity))::NUMERIC(18,2) END AS unit_profit,
  CASE WHEN p.price IS NULL OR p.price = 0 THEN NULL ELSE ((p.price - (((COALESCE(cc.component_cost, 0) + cr.labor_cost) * (1 + cr.overhead_percent / 100)) / cr.yield_quantity)) / p.price * 100)::NUMERIC(9,2) END AS margin_percent,
  COALESCE(cc.unpriced_items, 0)::INTEGER AS unpriced_items
FROM public.cost_recipes cr
LEFT JOIN component_costs cc ON cc.recipe_id = cr.id
LEFT JOIN public.products p ON p.id = cr.product_id;
GRANT SELECT ON public.cost_recipe_summary TO authenticated;
GRANT ALL ON public.cost_recipe_summary TO service_role;