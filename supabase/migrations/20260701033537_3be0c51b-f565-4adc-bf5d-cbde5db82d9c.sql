
DROP POLICY IF EXISTS "Anyone can read store status" ON public.app_settings;
CREATE POLICY "Anyone can read public settings"
  ON public.app_settings
  FOR SELECT
  TO anon, authenticated
  USING (key IN ('store_open','hero_image_url','hero_subtitle','hero_title','hero_notice'));

INSERT INTO public.app_settings (key, value) VALUES
  ('hero_image_url', ''),
  ('hero_subtitle', 'Confeitaria Artesanal'),
  ('hero_title', 'Meissa Vieira Confeitaria'),
  ('hero_notice', 'Pedidos realizados para o dia 5 de julho. Entregas e Retiradas a partir das 10h.')
ON CONFLICT (key) DO NOTHING;
