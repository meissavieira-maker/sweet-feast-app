import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { StoreHeader } from "@/components/storefront/StoreHeader";
import { CategoryTabs } from "@/components/storefront/CategoryTabs";
import { ProductCard } from "@/components/storefront/ProductCard";
import { CartFab } from "@/components/storefront/CartFab";
import { CartModal } from "@/components/storefront/CartModal";
import { CartProvider } from "@/lib/cart-context";
import { categories, products } from "@/lib/products";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Doçaria Belle Maison — Tortas, Bolos e Docinhos Artesanais" },
      {
        name: "description",
        content:
          "Tortas, bolos caseiros e docinhos gourmet feitos à mão todas as manhãs. Peça pelo app e receba em até 60 minutos.",
      },
      { property: "og:title", content: "Doçaria Belle Maison" },
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

  const visible = useMemo(() => products.filter((p) => p.category === activeCat), [activeCat]);
  const activeLabel = categories.find((c) => c.id === activeCat)?.label;

  return (
    <div className="min-h-screen bg-background pb-28">
      <StoreHeader />

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

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      </main>

      <CartFab onOpen={() => setCartOpen(true)} />
      <CartModal open={cartOpen} onOpenChange={setCartOpen} />
    </div>
  );
}
