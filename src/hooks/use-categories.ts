import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type CategoryRow = {
  id: string;
  slug: string;
  label: string;
  sort_order: number;
  active: boolean;
};

export function useCategories(includeInactive = false) {
  return useQuery({
    queryKey: ["categories", includeInactive],
    queryFn: async (): Promise<CategoryRow[]> => {
      let q = supabase
        .from("categories")
        .select("id,slug,label,sort_order,active")
        .order("sort_order", { ascending: true });
      if (!includeInactive) q = q.eq("active", true);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as CategoryRow[];
    },
    staleTime: 30_000,
  });
}
