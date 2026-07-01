import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import heroAsset from "@/assets/festival-novo.png.asset.json";

export type HeroSettings = {
  hero_image_url: string;
  hero_subtitle: string;
  hero_title: string;
  hero_notice: string;
};

export const HERO_DEFAULTS: HeroSettings = {
  hero_image_url: heroAsset.url,
  hero_subtitle: "Confeitaria Artesanal",
  hero_title: "Meissa Vieira Confeitaria",
  hero_notice:
    "Pedidos realizados para o dia 5 de julho. Entregas e Retiradas a partir das 10h.",
};

export const HERO_KEYS = [
  "hero_image_url",
  "hero_subtitle",
  "hero_title",
  "hero_notice",
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
      };
    },
    staleTime: 30_000,
  });
}
