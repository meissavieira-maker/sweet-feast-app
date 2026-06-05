import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Settings } from "lucide-react";
import { StoreHeader } from "@/components/storefront/StoreHeader";
import { CategoryTabs } from "@/components/storefront/CategoryTabs";
import { ProductCard } from "@/components/storefront/ProductCard";
import { CartFab } from "@/components/storefront/CartFab";
import { CartModal } from "@/components/storefront/CartModal";
import { CartProvider } from "@/lib/cart-context";
import { categories, type Product } from "@/lib/products";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Meissa Vieira Confeitaria — Tortas, Bolos e Docinhos Artesanais" },
      {
        name: "description",
        content:
          "Tortas, bolos caseiros e docinhos gourmet feitos à mão todas as manhãs. Peça pelo app e receba em até 60 minutos.",
      },
      { property: "og:title", content: "Meissa Vieira Confeitaria" },
      { property: "og:description", content: "Doces artesanais entregues na sua porta em até 60 minutos." },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <CartProvider>
      <Store />
    </CartProvider>
  );
}

function Store() {
  const [activeCat, setActiveCat] = useState(categories[0].id);
  const [cartOpen, setCartOpen] = useState(false);

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["storefront-products"],
    queryFn: async (): Promise<Product[]> => {
      const { data, error } = await supabase
        .from("products")
        .select("id,name,description,price,category,image_url,stock,badge")
        .eq("active", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Product[];
    },
  });

  const visible = useMemo(() => {
    const filtered = products.filter((p) => p.category === activeCat);
    if (activeCat !== "fatias") return filtered;
    const fatiaKeywords = ["torta", "red velvet"];
    return filtered.sort((a, b) => {
      const aIsFatia = fatiaKeywords.some((k) => a.name.toLowerCase().includes(k));
      const bIsFatia = fatiaKeywords.some((k) => b.name.toLowerCase().includes(k));
      if (aIsFatia && !bIsFatia) return -1;
      if (!aIsFatia && bIsFatia) return 1;
      return 0;
    });
  }, [products, activeCat]);
  const activeLabel = categories.find((c) => c.id === activeCat)?.label;

  return (
    <div className="min-h-screen bg-background pb-28">
      <StoreHeader />

      <div className="mx-auto max-w-6xl px-5 pt-5">
        <div className="rounded-2xl border border-gold/40 bg-gradient-to-r from-cherry/15 via-card to-gold/10 px-4 py-3 sm:px-6 sm:py-4 shadow-soft">
          <p className="text-center text-sm sm:text-base font-semibold text-foreground leading-snug">
            ⚠️ Reservas feitas pelo site! Pedidos liberados <span className="text-cherry">Domingo a partir das 14h</span>.
          </p>
        </div>
      </div>

      <main className="mx-auto max-w-6xl px-5">

        <CategoryTabs active={activeCat} onChange={setActiveCat} />

        <section className="py-8 sm:py-12">
          <div className="mb-6 flex items-end justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground">Coleção</p>
              <h2 className="font-display text-3xl sm:text-4xl text-foreground">{activeLabel}</h2>
            </div>
            <span className="text-sm text-muted-foreground">
              {visible.length} {visible.length === 1 ? "item" : "itens"}
            </span>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-20 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : visible.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card/50 p-12 text-center">
              <p className="font-display text-lg text-card-foreground">Nenhum produto nesta categoria ainda.</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Cadastre produtos no{" "}
                <Link to="/admin" className="text-primary underline-offset-4 hover:underline">
                  Painel do Admin
                </Link>{" "}
                para vê-los aqui.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {visible.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </section>
      </main>

      <Link
        to="/admin"
        className="fixed bottom-5 left-5 z-40 inline-flex items-center gap-1.5 rounded-full bg-card/80 px-3 py-2 text-xs text-muted-foreground shadow-soft backdrop-blur hover:text-primary"
      >
        <Settings className="h-3.5 w-3.5" />
        Admin
      </Link>

      <CartFab onOpen={() => setCartOpen(true)} />
      <CartModal open={cartOpen} onOpenChange={setCartOpen} />
    </div>
  );
}
