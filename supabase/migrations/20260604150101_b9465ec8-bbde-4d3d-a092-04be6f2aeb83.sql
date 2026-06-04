
-- Allow public read access to the store_open setting only
CREATE POLICY "Anyone can read store status"
  ON public.app_settings
  FOR SELECT
  TO anon, authenticated
  USING (key = 'store_open');

GRANT SELECT ON public.app_settings TO anon;

-- Seed default store_open = true
INSERT INTO public.app_settings (key, value)
VALUES ('store_open', 'true')
ON CONFLICT (key) DO NOTHING;
