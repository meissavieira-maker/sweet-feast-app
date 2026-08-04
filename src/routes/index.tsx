import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Settings } from "lucide-react";
import { StoreHeader } from "@/components/storefront/StoreHeader";
import { StoreInfoBar } from "@/components/storefront/StoreInfoBar";
import { CategoryTabs } from "@/components/storefront/CategoryTabs";
import { ProductRow, ProductHighlightCard } from "@/components/storefront/ProductCard";
import { BottomNav } from "@/components/storefront/BottomNav";
import { CartModal } from "@/components/storefront/CartModal";
import { StoreProfileModal } from "@/components/storefront/StoreProfileModal";
import { CartProvider } from "@/lib/cart-context";
import type { Product } from "@/lib/products";
import { supabase } from "@/integrations/supabase/client";
import { useCategories } from "@/hooks/use-categories";

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

const FEATURED_SLUG = "__mais-pedidos";

const normalize = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

function Store() {
  const [cartOpen, setCartOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeCat, setActiveCat] = useState("");
  const stickyRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  const { data: categories = [] } = useCategories();

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["storefront-products"],
    queryFn: async (): Promise<Product[]> => {
      const { data, error } = await supabase
        .from("products")
        .select("id,name,description,price,category,image_url,stock,badge,featured")
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

  const filtered = useMemo(() => {
    const q = normalize(query);
    if (!q) return sorted;
    return sorted.filter(
      (p) => normalize(p.name).includes(q) || normalize(p.description ?? "").includes(q),
    );
  }, [sorted, query]);

  const highlights = useMemo(
    () => sorted.filter((p) => p.featured).slice(0, 4),
    [sorted],
  );

  const tabs = useMemo(() => {
    const list = categories.map((c) => ({ ...c }));
    if (highlights.length > 0 && !query) {
      list.unshift({
        id: "featured",
        slug: FEATURED_SLUG,
        label: "Mais Pedidos",
        sort_order: -1,
        active: true,
      });
    }
    return list;
  }, [categories, highlights.length, query]);

  useEffect(() => {
    if (tabs.length > 0 && tabs[0].slug !== activeCat && window.scrollY < 40) {
      setActiveCat(tabs[0].slug);
    }
  }, [tabs, activeCat]);


  // Destaca a aba da seção visível durante o scroll
  useEffect(() => {
    function onScroll() {
      const offset = (stickyRef.current?.offsetHeight ?? 0) + 24;
      let current = activeCat;
      for (const c of tabs) {
        const el = sectionRefs.current[c.slug];
        if (el && el.getBoundingClientRect().top - offset <= 0) current = c.slug;
      }
      if (current && current !== activeCat) setActiveCat(current);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [tabs, activeCat]);

  function scrollToCategory(slug: string) {
    setActiveCat(slug);
    const el = sectionRefs.current[slug];
    if (!el) return;
    const offset = (stickyRef.current?.offsetHeight ?? 0) + 8;
    const top = el.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top, behavior: "smooth" });
  }

  return (
    <div id="top" className="min-h-screen bg-background pb-32">
      <div ref={stickyRef} className="sticky top-0 z-40 shadow-sm">
        <StoreHeader query={query} onQueryChange={setQuery} />
        <StoreInfoBar minOrder={20} onProfile={() => setProfileOpen(true)} />
        {tabs.length > 0 && (
          <CategoryTabs categories={tabs} active={activeCat} onSelect={scrollToCategory} />
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : (
        <>
          {highlights.length > 0 && !query && (
            <section
              id={`cat-${FEATURED_SLUG}`}
              ref={(el) => {
                sectionRefs.current[FEATURED_SLUG] = el;
              }}
              className="mx-auto max-w-3xl scroll-mt-40 px-4 pt-6"
            >
              <h2 className="font-sans text-sm font-bold uppercase tracking-wide text-foreground sm:text-base">
                Mais Pedidos
              </h2>
              <div className="no-scrollbar -mx-4 mt-3 flex gap-3 overflow-x-auto px-4 pb-2">
                {highlights.map((p) => (
                  <ProductHighlightCard key={p.id} product={p} />
                ))}
              </div>
            </section>
          )}

          <main className="mx-auto max-w-3xl px-4">
            {categories.map((c) => {
              const items = filtered.filter((p) => p.category === c.slug);
              if (query && items.length === 0) return null;
              return (
                <section
                  key={c.id}
                  id={`cat-${c.slug}`}
                  ref={(el) => {
                    sectionRefs.current[c.slug] = el;
                  }}
                  className="scroll-mt-40 pt-6"
                >
                  <div className="border-b border-border pb-2">
                    <h2 className="font-sans text-sm font-bold uppercase tracking-wide text-foreground sm:text-base">
                      {c.label}
                    </h2>
                  </div>

                  {items.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-border bg-card/50 p-8 text-center">
                      <p className="text-sm font-semibold text-card-foreground">
                        Nenhum produto nesta categoria ainda.
                      </p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        Cadastre produtos no{" "}
                        <Link to="/admin" className="text-brand underline-offset-4 hover:underline">
                          Painel do Admin
                        </Link>
                        .
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y divide-border">
                      {items.map((p) => (
                        <ProductRow key={p.id} product={p} />
                      ))}
                    </div>
                  )}
                </section>
              );
            })}

            {query && filtered.length === 0 && (
              <div className="mt-6 rounded-xl border border-dashed border-border bg-card/50 p-10 text-center">
                <p className="text-sm font-semibold text-card-foreground">
                  Nenhum produto encontrado.
                </p>
              </div>
            )}

            <section id="perfil-da-loja" className="mt-4 border-t border-border py-8">
              <h2 className="font-sans text-sm font-bold uppercase tracking-wide text-foreground">Perfil da loja</h2>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground sm:text-sm">
                Meissa Vieira Confeitaria — Rua Rodrigo Brandão, 32, Cachoeira-BA.
                <br />
                Entregas em Cachoeira, São Félix, Capoeiruçu e Muritiba. Retirada no local sem taxa.
              </p>
              <button
                type="button"
                onClick={() => setProfileOpen(true)}
                className="mt-4 inline-flex rounded-full bg-brand px-4 py-2 text-xs font-semibold text-brand-foreground hover:brightness-110"
              >
                Ver perfil completo da loja
              </button>
              <br />
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
      <StoreProfileModal open={profileOpen} onOpenChange={setProfileOpen} />
      <CartModal open={cartOpen} onOpenChange={setCartOpen} />
    </div>
  );
}
