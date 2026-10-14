import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import heroAsset from "@/assets/festival-novo.png.asset.json";

export type HeroSettings = {
  hero_image_url: string;
  hero_subtitle: string;
  hero_title: string;
  hero_notice: string;
  whatsapp_template: string;
};

export const DEFAULT_WHATSAPP_TEMPLATE = `\u{1F370} *MEISSA VIEIRA • CONFEITARIA DELIVERY* \u{1F370}
━━━━━━━━━━━━━━━━━━━━
\u{1F9FE} *Pedido:* #{id}
\u{1F464} *Cliente:* {cliente}
\u{1F4F1} *WhatsApp:* {telefone}
\u{1F69A} *Forma de recebimento:* {modo}
\u{1F4CD} *Endereço:* {endereco}

━━━━━━━━━━━━━━━━━━━━
\u{1F6CD}\u{FE0F} *ITENS DO PEDIDO*
{itens}

\u{1F4B0} *TOTAL DO PEDIDO: {total}*
━━━━━━━━━━━━━━━━━━━━
\u{1F4CC} *Importante:* Seus produtos estão reservados. Aguarde a confirmação do pedido.

\u{1F552} *Horário de funcionamento:* Consulte os horários atualizados da loja.

\u{1F49B} Obrigada pela preferência! Qualquer dúvida, é só chamar por aqui.`;

export const HERO_DEFAULTS: HeroSettings = {
  hero_image_url: heroAsset.url,
  hero_subtitle: "Confeitaria Artesanal",
  hero_title: "Meissa Vieira Confeitaria",
  hero_notice:
    "Pedidos realizados para o dia 5 de julho. Entregas e Retiradas a partir das 10h.",
  whatsapp_template: DEFAULT_WHATSAPP_TEMPLATE,
};

export const HERO_KEYS = [
  "hero_image_url",
  "hero_subtitle",
  "hero_title",
  "hero_notice",
  "whatsapp_template",
] as const;

export function useHeroSettings() {
  return useQuery({
    queryKey: ["hero-settings"],
    queryFn: async (): Promise<HeroSettings> => {
      const { data, error } = await supabase
        .from("app_settings")
        .select("key,value")
        .in("key", HERO_KEYS as unknown as string[]);
      if (error) throw error;
      const map = Object.fromEntries((data ?? []).map((r) => [r.key, r.value]));
      return {
        hero_image_url: map.hero_image_url?.trim() ? map.hero_image_url : HERO_DEFAULTS.hero_image_url,
        hero_subtitle: map.hero_subtitle?.trim() ? map.hero_subtitle : HERO_DEFAULTS.hero_subtitle,
        hero_title: map.hero_title?.trim() ? map.hero_title : HERO_DEFAULTS.hero_title,
        hero_notice: map.hero_notice?.trim() ? map.hero_notice : HERO_DEFAULTS.hero_notice,
        whatsapp_template: map.whatsapp_template?.trim() ? map.whatsapp_template : HERO_DEFAULTS.whatsapp_template,
      };
    },
    staleTime: 30_000,
  });
}
