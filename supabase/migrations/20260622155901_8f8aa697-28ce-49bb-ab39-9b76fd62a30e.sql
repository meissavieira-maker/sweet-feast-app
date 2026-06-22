
-- Public read on product-images
DROP POLICY IF EXISTS "Public read product-images" ON storage.objects;
CREATE POLICY "Public read product-images" ON storage.objects
FOR SELECT TO anon, authenticated
USING (bucket_id = 'product-images');

-- Admin-only write
DROP POLICY IF EXISTS "Admin insert product-images" ON storage.objects;
CREATE POLICY "Admin insert product-images" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'product-images' AND public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admin update product-images" ON storage.objects;
CREATE POLICY "Admin update product-images" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'product-images' AND public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admin delete product-images" ON storage.objects;
CREATE POLICY "Admin delete product-images" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'product-images' AND public.has_role(auth.uid(), 'admin'));
