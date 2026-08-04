import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Settings } from "lucide-react";
import { StoreHeader } from "@/components/storefront/StoreHeader";
import { StoreInfoBar } from "@/components/storefront/StoreInfoBar";
import { CategoryTabs } from "@/components/storefront/CategoryTabs";
import { ProductRow, ProductHighlightCard } from "@/components/storefront/ProductCard";
import { BottomNav } from "@/components/storefront/BottomNav";
import { CartModal } from "@/components/storefront/CartModal";
import { CartProvider } from "@/lib/cart-context";
import { categories, type Product } from "@/lib/products";
import { supabase } from "@/integrations/supabase/client";
import { useHeroSettings } from "@/hooks/use-hero-settings";

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

const MANUAL_ORDER: string[] = [
  "torta pudim",
  "torta matilda",
  "torta red velvet",
  "torta chocolate com maracuja",
  "ninho com geleia de morango",
  "torta crocante",
  "palha italiana",
  "tapioca com doce de leite",
  "olho de sogra",
  "mousse de limao com creme de coco",
  "brigadeiro",
  "dois amores",
  "ninho",
  "red velvet",
  "ovomaltine",
  "pudim no pote",
  "tapioca",
];

const normalize = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

function Store() {
  const [activeCat, setActiveCat] = useState(categories[0].id);
  const [cartOpen, setCartOpen] = useState(false);
  const [query, setQuery] = useState("");
  const { data: hero } = useHeroSettings();

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

  const sorted = useMemo(() => {
    const rankOf = (name: string) => {
      const idx = MANUAL_ORDER.indexOf(normalize(name));
      return idx === -1 ? Infinity : idx;
    };
    return [...products].sort((a, b) => rankOf(a.name) - rankOf(b.name));
  }, [products]);

  const visible = useMemo(() => {
    const q = normalize(query);
    return sorted.filter(
      (p) =>
        p.category === activeCat &&
        (q === "" || normalize(p.name).includes(q) || normalize(p.description ?? "").includes(q)),
    );
  }, [sorted, activeCat, query]);

  const highlights = useMemo(
    () => sorted.filter((p) => p.stock > 0).slice(0, 8),
    [sorted],
  );

  const activeLabel = categories.find((c) => c.id === activeCat)?.label;

  return (
    <div id="top" className="min-h-screen bg-background pb-32">
      <StoreHeader query={query} onQueryChange={setQuery} />
      <StoreInfoBar minOrder={20} />

      <div className="mx-auto max-w-3xl px-4 pt-4">
        <div className="rounded-xl border border-border bg-card px-4 py-3 shadow-soft">
          <p className="text-center text-xs font-semibold leading-snug text-foreground sm:text-sm">
            {hero?.hero_notice ?? "Pedidos realizados para o dia 5 de julho. Entregas e Retiradas a partir das 10h."}
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : (
        <>
          {highlights.length > 0 && !query && (
            <section className="mx-auto max-w-3xl px-4 pt-6">
              <h2 className="font-sans text-sm font-bold uppercase tracking-wide text-foreground sm:text-base">
                Os mais pedidos
              </h2>
              <div className="no-scrollbar -mx-4 mt-3 flex gap-3 overflow-x-auto px-4 pb-2">
                {highlights.map((p) => (
                  <ProductHighlightCard key={p.id} product={p} />
                ))}
              </div>
            </section>
          )}

          <div className="mt-4">
            <CategoryTabs active={activeCat} onChange={setActiveCat} />
          </div>

          <main className="mx-auto max-w-3xl px-4">
            <section className="pt-6">
              <div className="border-b border-border pb-2">
                <h2 className="font-sans text-sm font-bold uppercase tracking-wide text-foreground sm:text-base">
                  {activeLabel}
                </h2>
              </div>

              {visible.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border bg-card/50 p-10 text-center">
                  <p className="text-sm font-semibold text-card-foreground">
                    {query ? "Nenhum produto encontrado." : "Nenhum produto nesta categoria ainda."}
                  </p>
                  {!query && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Cadastre produtos no{" "}
                      <Link to="/admin" className="text-brand underline-offset-4 hover:underline">
                        Painel do Admin
                      </Link>
                      .
                    </p>
                  )}
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {visible.map((p) => (
                    <ProductRow key={p.id} product={p} />
                  ))}
                </div>
              )}
            </section>

            <section id="perfil-da-loja" className="border-t border-border py-8">
              <h2 className="font-sans text-sm font-bold uppercase tracking-wide text-foreground">Perfil da loja</h2>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground sm:text-sm">
                Meissa Vieira Confeitaria — Rua Rodrigo Brandão, 32, Cachoeira-BA.
                <br />
                Entregas em Cachoeira, São Félix, Capoeiruçu e Muritiba. Retirada no local sem taxa.
              </p>
              <Link
                to="/admin"
                className="mt-4 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-brand"
              >
                <Settings className="h-3.5 w-3.5" />
                Painel do Admin
              </Link>
            </section>
          </main>
        </>
      )}

      <BottomNav onOrders={() => setCartOpen(true)} />
      <CartModal open={cartOpen} onOpenChange={setCartOpen} />
    </div>
  );
}
