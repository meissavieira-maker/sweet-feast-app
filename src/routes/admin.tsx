import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Loader2, LogOut, Package, ShoppingBag, ArrowLeft, Settings, LayoutList, ChartNoAxesCombined, CircleDollarSign } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAdminAuth } from "@/hooks/use-admin-auth";
import { AdminAuth } from "@/components/admin/AdminAuth";
import { AdminProducts } from "@/components/admin/AdminProducts";
import { AdminOrders } from "@/components/admin/AdminOrders";
import { AdminSettings } from "@/components/admin/AdminSettings";
import { AdminCategories } from "@/components/admin/AdminCategories";
import { AdminPDV, bahiaDateString, shiftDate } from "@/components/admin/AdminPDV";
import { AdminCosts } from "@/components/admin/AdminCosts";
import { OrderSoundAlert } from "@/components/admin/OrderSoundAlert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/admin")({
  validateSearch: (search: Record<string, unknown>) => {
    const allowedTabs = ["produtos", "categorias", "pedidos", "config", "pdv", "custos"] as const;
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
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="mb-6 overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-brand via-brand to-brand-deep p-5 text-brand-foreground shadow-card sm:p-7">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-gold">Painel de gestão</p>
              <h1 className="mt-1 font-display text-2xl font-semibold sm:text-3xl">Sua confeitaria, em um só lugar</h1>
              <p className="mt-2 max-w-xl text-sm text-brand-foreground/75">Gerencie a loja, acompanhe pedidos e cuide dos números do negócio.</p>
            </div>
            <span className="w-fit rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-medium">Meissa Vieira Confeitaria</span>
          </div>
        </div>
        <Tabs value={tab} onValueChange={(value) => void navigate({ search: (previous) => ({ ...previous, tab: value as typeof tab }), replace: true })}>
          <div className="no-scrollbar overflow-x-auto rounded-2xl border border-border bg-card p-1.5 shadow-soft">
          <TabsList className="w-max bg-transparent p-0">
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
            <TabsTrigger value="custos" className="gap-1.5">
              <CircleDollarSign className="h-4 w-4" /> Custos
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
          <TabsContent value="custos" className="mt-6">
            <AdminCosts />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function TopBar({ email, onLogout, soundAlert = false }: { email?: string | null; onLogout?: () => void; soundAlert?: boolean }) {
  return (
    <header className="sticky top-0 z-30 border-b border-border/80 bg-card/90 shadow-soft backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:border-primary/30 hover:text-primary"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Loja
          </Link>
          <div className="h-4 w-px bg-border" />
          <span className="font-display text-base font-semibold text-foreground sm:text-lg">Painel · Meissa Vieira</span>
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
