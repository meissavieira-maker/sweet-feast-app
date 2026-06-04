import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useStoreStatus() {
  const [isOpen, setIsOpen] = useState<boolean | null>(null);

  async function refresh() {
    const { data } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "store_open")
      .maybeSingle();
    setIsOpen(data?.value !== "false");
  }

  useEffect(() => {
    void refresh();
    const ch = supabase
      .channel(`app_settings_store_open_${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "app_settings", filter: "key=eq.store_open" },
        (payload) => {
          const row = (payload.new ?? payload.old) as { value?: string } | null;
          if (row && typeof row.value === "string") setIsOpen(row.value !== "false");
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, []);

  return { isOpen: isOpen ?? true, loading: isOpen === null, refresh };
}
