DROP POLICY IF EXISTS "Anyone can read public settings" ON public.app_settings;
CREATE POLICY "Anyone can read public settings" ON public.app_settings
FOR SELECT
USING (key = ANY (ARRAY['store_open','hero_image_url','hero_subtitle','hero_title','hero_notice','whatsapp_template','business_hours']));