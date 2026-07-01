
DROP POLICY IF EXISTS "Anyone can read public settings" ON public.app_settings;
CREATE POLICY "Anyone can read public settings" ON public.app_settings
  FOR SELECT
  USING (key = ANY (ARRAY['store_open','hero_image_url','hero_subtitle','hero_title','hero_notice','whatsapp_template']));

INSERT INTO public.app_settings (key, value)
VALUES ('whatsapp_template',
'🍰 *1º Festival de Fatias — Meissa Vieira* 🍰
-----------------------------------------
🆔 *Pedido:* #{id}
👤 *Cliente:* {cliente}
📞 *WhatsApp:* {telefone}
🛵 *Forma de Envio:* {modo}
📍 *Endereço:* {endereco}
🍫 *Calda escolhida:* {calda}

🛒 *Fatias Reservadas:*
{itens}

💰 *Total Geral:* {total}
-----------------------------------------
👉 *Lembrete:* Seus produtos estão reservados! Os envios e retiradas começam neste Domingo a partir das 14h.')
ON CONFLICT (key) DO NOTHING;
