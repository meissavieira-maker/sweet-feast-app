import { Plus, Check, ShoppingBag } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { Product } from "@/lib/products";
import { formatBRL, useCart } from "@/lib/cart-context";

/** Product list row; selecting an available product adds it to the cart. */
export function ProductRow({ product }: { product: Product }) {
  const { add } = useCart();
  const [added, setAdded] = useState(false);
  const soldOut = product.stock <= 0;

  function addProduct() {
    if (soldOut) return;
    add(product);
    setAdded(true);
    toast.success(`${product.name} adicionado ao carrinho`);
    window.setTimeout(() => setAdded(false), 1100);
  }

  return (
    <article className="group flex items-center gap-3.5 rounded-2xl border border-border/75 bg-card p-3 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-card sm:gap-4 sm:p-4">
      <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-muted sm:h-28 sm:w-28">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            loading="lazy"
            className={`h-full w-full object-cover transition-transform duration-500 group-hover:scale-105 ${soldOut ? "grayscale" : ""}`}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
            <ShoppingBag className="h-6 w-6 opacity-40" />
          </div>
        )}
        {product.badge && !soldOut && (
          <span className="absolute left-1.5 top-1.5 max-w-[calc(100%-12px)] truncate rounded-full bg-gold px-2 py-1 text-[9px] font-bold text-gold-foreground shadow-soft">
            {product.badge}
          </span>
        )}
        {soldOut && (
          <span className="absolute inset-x-0 bottom-0 bg-ink/85 py-1.5 text-center text-[9px] font-bold uppercase tracking-wider text-ink-foreground">
            Esgotado
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1 self-stretch py-0.5">
        <h3 className="line-clamp-2 font-sans text-sm font-bold leading-snug text-foreground sm:text-base">{product.name}</h3>
        {product.description && (
          <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground sm:text-sm">
            {product.description}
          </p>
        )}
        <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-bold tabular-nums text-brand sm:text-base">
            {soldOut ? "Indisponível" : formatBRL(product.price)}
          </p>
          <button
            type="button"
            onClick={addProduct}
            disabled={soldOut}
            aria-label={soldOut ? `${product.name} esgotado` : `Adicionar ${product.name} ao carrinho`}
            className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-40 sm:h-10 sm:w-10 ${added ? "bg-emerald-600 text-white" : "bg-brand text-brand-foreground shadow-soft hover:-translate-y-0.5 hover:brightness-110"}`}
          >
            {added ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </article>
  );
}

/** Square card used inside the "Mais pedidos" carousel. */
export function ProductHighlightCard({ product }: { product: Product }) {
  const { add } = useCart();
  const soldOut = product.stock <= 0;

  return (
    <button
      type="button"
      onClick={() => !soldOut && add(product)}
      disabled={soldOut}
      aria-label={soldOut ? `${product.name}, esgotado` : `Adicionar ${product.name} ao carrinho`}
      className="group w-40 shrink-0 overflow-hidden rounded-2xl border border-border/80 bg-card p-2.5 text-left transition-all duration-200 hover:-translate-y-1 hover:border-primary/30 hover:shadow-card disabled:opacity-60 sm:w-44"
    >
      <div className="relative aspect-square overflow-hidden rounded-xl bg-muted">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            loading="lazy"
            className={`h-full w-full object-cover transition-transform duration-500 group-hover:scale-105 ${soldOut ? "grayscale" : ""}`}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
            <ShoppingBag className="h-7 w-7 opacity-40" />
          </div>
        )}
        {product.badge && !soldOut && (
          <span className="absolute left-2 top-2 max-w-[calc(100%-16px)] truncate rounded-full bg-gold px-2 py-1 text-[9px] font-bold text-gold-foreground shadow-soft">{product.badge}</span>
        )}
        {soldOut && <span className="absolute inset-x-0 bottom-0 bg-ink/85 py-1.5 text-center text-[9px] font-bold uppercase tracking-wider text-ink-foreground">Esgotado</span>}
      </div>
      <p className="mt-3 line-clamp-2 text-sm font-semibold leading-snug text-foreground">{product.name}</p>
      <div className="mt-2 flex items-center justify-between gap-2">
        <p className="text-sm font-bold tabular-nums text-brand">{soldOut ? "Indisponível" : formatBRL(product.price)}</p>
        {!soldOut && <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent text-accent-foreground"><Plus className="h-3.5 w-3.5" /></span>}
      </div>
    </button>
  );
}
