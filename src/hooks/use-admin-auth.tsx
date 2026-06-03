import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";

export type AdminAuthState = {
  loading: boolean;
  session: Session | null;
  isAdmin: boolean;
  refresh: () => Promise<void>;
};

export function useAdminAuth(): AdminAuthState {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  async function checkAdmin(uid: string | undefined) {
    if (!uid) {
      setIsAdmin(false);
      return;
    }
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", uid)
      .eq("role", "admin")
      .maybeSingle();
    setIsAdmin(!!data);
  }

  async function refresh() {
    const { data } = await supabase.auth.getSession();
    setSession(data.session);
    await checkAdmin(data.session?.user.id);
  }

  useEffect(() => {
    // Listener first
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      // Defer to avoid deadlocks
      setTimeout(() => {
        void checkAdmin(s?.user.id);
      }, 0);
    });

    // Then fetch existing session
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      await checkAdmin(data.session?.user.id);
      setLoading(false);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  return { loading, session, isAdmin, refresh };
}
