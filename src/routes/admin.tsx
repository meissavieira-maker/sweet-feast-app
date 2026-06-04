import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2, LogOut, Package, ShoppingBag, ArrowLeft, Settings } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAdminAuth } from "@/hooks/use-admin-auth";
import { AdminAuth } from "@/components/admin/AdminAuth";
import { AdminProducts } from "@/components/admin/AdminProducts";
import { AdminOrders } from "@/components/admin/AdminOrders";
import { AdminSettings } from "@/components/admin/AdminSettings";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Painel do Admin — Meissa Vieira Confeitaria" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AdminPage,
  ssr: false,
});

function AdminPage() {
  const { loading, session, isAdmin, refresh } = useAdminAuth();
  const [tab, setTab] = useState<"produtos" | "pedidos" | "config">("produtos");

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-background">
        <TopBar />
        <AdminAuth onAuthed={refresh} />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <TopBar email={session.user.email} onLogout={async () => { await supabase.auth.signOut(); }} />
        <div className="mx-auto max-w-md py-20 text-center">
          <h1 className="font-display text-2xl text-foreground">Acesso restrito</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Sua conta ainda não tem permissão de administrador.
          </p>
          <button
            onClick={async () => {
              const { data, error } = await supabase.rpc("claim_first_admin");
              if (error) return alert(error.message);
              if (data === true) await refresh();
              else alert("Já existe um admin. Peça acesso a quem administra o sistema.");
            }}
            className="mt-5 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
          >
            Tentar virar primeiro admin
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <TopBar email={session.user.email} onLogout={async () => { await supabase.auth.signOut(); }} />
      <main className="mx-auto max-w-6xl px-5 py-8">
        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
          <TabsList className="bg-secondary">
            <TabsTrigger value="produtos" className="gap-1.5">
              <Package className="h-4 w-4" /> Produtos
            </TabsTrigger>
            <TabsTrigger value="pedidos" className="gap-1.5">
              <ShoppingBag className="h-4 w-4" /> Pedidos
            </TabsTrigger>
          </TabsList>
          <TabsContent value="produtos" className="mt-6">
            <AdminProducts />
          </TabsContent>
          <TabsContent value="pedidos" className="mt-6">
            <AdminOrders />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function TopBar({ email, onLogout }: { email?: string | null; onLogout?: () => void }) {
  return (
    <header className="border-b border-border bg-card/60 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-5 py-3">
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Loja
          </Link>
          <div className="h-4 w-px bg-border" />
          <span className="font-display text-lg text-foreground">Painel · Meissa Vieira</span>
        </div>
        {email && (
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="hidden sm:inline">{email}</span>
            <button
              onClick={onLogout}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 hover:text-primary"
            >
              <LogOut className="h-3.5 w-3.5" /> Sair
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
