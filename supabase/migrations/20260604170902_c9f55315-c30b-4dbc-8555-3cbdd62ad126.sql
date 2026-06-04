
-- 1. Drop overly permissive SELECT policies on orders/order_items
DROP POLICY IF EXISTS "Anyone can read order by id" ON public.orders;
DROP POLICY IF EXISTS "Anyone can read order items by order" ON public.order_items;

-- 2. Tighten products SELECT to active only
DROP POLICY IF EXISTS "Anyone can read active products" ON public.products;
CREATE POLICY "Anyone can read active products"
  ON public.products FOR SELECT
  TO anon, authenticated
  USING (active = true);

-- 3. Block non-admin self-grant on user_roles via restrictive INSERT policy
DROP POLICY IF EXISTS "Only admins can insert roles" ON public.user_roles;
CREATE POLICY "Only admins can insert roles"
  ON public.user_roles AS RESTRICTIVE FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- 4. Restrict Realtime channel subscriptions to admins
DROP POLICY IF EXISTS "Admins only realtime access" ON realtime.messages;
CREATE POLICY "Admins only realtime access"
  ON realtime.messages FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- 5. Lock down SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION public.mark_order_paid(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mark_order_paid(uuid, text) TO service_role;

REVOKE EXECUTE ON FUNCTION public.claim_first_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_first_admin() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.auto_grant_owner_admin() FROM PUBLIC, anon, authenticated;
