CREATE POLICY "Admins can read all products"
ON public.products
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE VIEW public.cost_item_prices
WITH (security_invoker = true) AS
SELECT ci.id,
    ci.name,
    ci.kind,
    ci.base_unit,
    ci.active,
    COALESCE(sum(cpi.total_cost) / NULLIF(sum(
        CASE cpi.unit
            WHEN 'kg'::text THEN cpi.quantity * 1000::numeric
            WHEN 'l'::text THEN cpi.quantity * 1000::numeric
            ELSE cpi.quantity
        END), 0::numeric), 0::numeric)::numeric(18,6) AS unit_cost,
    COALESCE(sum(cpi.total_cost), 0::numeric)::numeric(18,2) AS purchased_total,
    ci.is_standard
FROM public.cost_items ci
LEFT JOIN public.cost_purchase_items cpi ON cpi.item_id = ci.id
GROUP BY ci.id, ci.name, ci.kind, ci.base_unit, ci.active, ci.is_standard;

GRANT SELECT ON public.cost_item_prices TO authenticated;
GRANT SELECT ON public.cost_item_prices TO service_role;