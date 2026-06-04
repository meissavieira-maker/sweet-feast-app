-- 1) Allow the owner email to always claim admin, even if other admins exist
CREATE OR REPLACE FUNCTION public.claim_first_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_email TEXT;
  v_has_admin BOOLEAN;
  v_already BOOLEAN;
BEGIN
  IF v_uid IS NULL THEN RETURN FALSE; END IF;

  SELECT email INTO v_email FROM auth.users WHERE id = v_uid;

  SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id = v_uid AND role = 'admin')
    INTO v_already;
  IF v_already THEN RETURN TRUE; END IF;

  -- Owner email is ALWAYS allowed to be admin
  IF lower(coalesce(v_email,'')) = 'meissavieira@hotmail.com' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (v_uid, 'admin')
      ON CONFLICT DO NOTHING;
    RETURN TRUE;
  END IF;

  SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE role = 'admin') INTO v_has_admin;
  IF v_has_admin THEN RETURN FALSE; END IF;

  INSERT INTO public.user_roles (user_id, role) VALUES (v_uid, 'admin')
    ON CONFLICT DO NOTHING;
  RETURN TRUE;
END;
$$;

-- 2) Auto-grant admin on signup/login for the owner email
CREATE OR REPLACE FUNCTION public.auto_grant_owner_admin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF lower(coalesce(NEW.email,'')) = 'meissavieira@hotmail.com' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin')
      ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_grant_owner_admin ON auth.users;
CREATE TRIGGER trg_auto_grant_owner_admin
AFTER INSERT OR UPDATE OF email ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.auto_grant_owner_admin();

-- Backfill if the owner already has an account
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role FROM auth.users
WHERE lower(email) = 'meissavieira@hotmail.com'
ON CONFLICT DO NOTHING;

-- 3) Mercado Pago tracking columns
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS mp_preference_id TEXT,
  ADD COLUMN IF NOT EXISTS mp_payment_id TEXT,
  ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'pendente';

-- Allow public (anon) read of a single order by id for the success page
DROP POLICY IF EXISTS "Anyone can read order by id" ON public.orders;
CREATE POLICY "Anyone can read order by id"
ON public.orders FOR SELECT
TO anon, authenticated
USING (true);

GRANT SELECT ON public.orders TO anon;

DROP POLICY IF EXISTS "Anyone can read order items by order" ON public.order_items;
CREATE POLICY "Anyone can read order items by order"
ON public.order_items FOR SELECT
TO anon, authenticated
USING (true);

GRANT SELECT ON public.order_items TO anon;

-- 4) Helper used by the MP webhook (called via service role) to mark paid
CREATE OR REPLACE FUNCTION public.mark_order_paid(_order_id UUID, _mp_payment_id TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.orders
     SET payment_status = 'pago',
         mp_payment_id = _mp_payment_id,
         status = CASE WHEN status = 'pendente' THEN 'pendente'::order_status ELSE status END,
         updated_at = now()
   WHERE id = _order_id;
END;
$$;