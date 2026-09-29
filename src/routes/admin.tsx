import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Loader2, LogOut, Package, ShoppingBag, ArrowLeft, Settings, LayoutList, ChartNoAxesCombined } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAdminAuth } from "@/hooks/use-admin-auth";
import { AdminAuth } from "@/components/admin/AdminAuth";
import { AdminProducts } from "@/components/admin/AdminProducts";
import { AdminOrders } from "@/components/admin/AdminOrders";
import { AdminSettings } from "@/components/admin/AdminSettings";
import { AdminCategories } from "@/components/admin/AdminCategories";
import { AdminPDV, bahiaDateString, shiftDate } from "@/components/admin/AdminPDV";
import { OrderSoundAlert } from "@/components/admin/OrderSoundAlert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/admin")({
  validateSearch: (search: Record<string, unknown>) => {
    const allowedTabs = ["produtos", "categorias", "pedidos", "config", "pdv"] as const;
    const tab = allowedTabs.find((value) => value === search.tab) ?? "produtos";
    const datePattern = /^\d{4}-\d{2}-\d{2}$/;
    const today = bahiaDateString();
    const from = typeof search.from === "string" && datePattern.test(search.from) ? search.from : shiftDate(today, -6);
    const to = typeof search.to === "string" && datePattern.test(search.to) ? search.to : today;
    return { tab, from: from <= to ? from : to, to: to >= from ? to : from };
  },
  head: () => ({
    meta: [
      { title: "Painel do Admin — Meissa Vieira Confeitaria" },
      { name: "description", content: "Gerenciamento de produtos, pedidos e configurações da Meissa Vieira Confeitaria." },
      { property: "og:title", content: "Painel do Admin — Meissa Vieira Confeitaria" },
      { property: "og:description", content: "Gerenciamento da Meissa Vieira Confeitaria." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AdminPage,
  ssr: false,
});

function AdminPage() {
  const { loading, session, isAdmin, refresh } = useAdminAuth();
  const { tab, from, to } = Route.useSearch();
  const navigate = useNavigate({ from: "/admin" });

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
          <Button
            onClick={async () => {
              const { data, error } = await supabase.rpc("claim_first_admin");
              if (error) return alert(error.message);
              if (data === true) await refresh();
              else alert("Já existe um admin. Peça acesso a quem administra o sistema.");
            }}
            className="mt-5"
          >
            Tentar virar primeiro admin
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <TopBar email={session.user.email} onLogout={async () => { await supabase.auth.signOut(); }} soundAlert />
      <main className="mx-auto max-w-6xl px-5 py-8">
        <Tabs value={tab} onValueChange={(value) => void navigate({ search: (previous) => ({ ...previous, tab: value as typeof tab }), replace: true })}>
          <div className="no-scrollbar overflow-x-auto">
          <TabsList className="w-max bg-secondary">
            <TabsTrigger value="produtos" className="gap-1.5">
              <Package className="h-4 w-4" /> Produtos
            </TabsTrigger>
            <TabsTrigger value="categorias" className="gap-1.5">
              <LayoutList className="h-4 w-4" /> Categorias
            </TabsTrigger>
            <TabsTrigger value="pedidos" className="gap-1.5">
              <ShoppingBag className="h-4 w-4" /> Pedidos
            </TabsTrigger>
            <TabsTrigger value="config" className="gap-1.5">
              <Settings className="h-4 w-4" /> Configurações
            </TabsTrigger>
            <TabsTrigger value="pdv" className="gap-1.5">
              <ChartNoAxesCombined className="h-4 w-4" /> PDV
            </TabsTrigger>
          </TabsList>
          </div>
          <TabsContent value="produtos" className="mt-6">
            <AdminProducts />
          </TabsContent>
          <TabsContent value="categorias" className="mt-6">
            <AdminCategories />
          </TabsContent>
          <TabsContent value="pedidos" className="mt-6">
            <AdminOrders />
          </TabsContent>
          <TabsContent value="config" className="mt-6">
            <AdminSettings />
          </TabsContent>
          <TabsContent value="pdv" className="mt-6">
            <AdminPDV
              from={from}
              to={to}
              onRangeChange={(range) => void navigate({ search: (previous) => ({ ...previous, tab: "pdv", ...range }), replace: true })}
            />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function TopBar({ email, onLogout, soundAlert = false }: { email?: string | null; onLogout?: () => void; soundAlert?: boolean }) {
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
            {soundAlert && <OrderSoundAlert />}
            <span className="hidden sm:inline">{email}</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onLogout}
            >
              <LogOut className="h-3.5 w-3.5" /> Sair
            </Button>
          </div>
        )}
      </div>
    </header>
  );
}
