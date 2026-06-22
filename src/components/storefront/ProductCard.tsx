import { Plus } from "lucide-react";
import type { Product } from "@/lib/products";
import { formatBRL, useCart } from "@/lib/cart-context";

export function ProductCard({ product }: { product: Product }) {
  const { add } = useCart();
  const name = product?.name || "Produto sem nome";
  const description = product?.description || "";
  const imageUrl = product?.image_url || "";
  const price = product?.price ?? 0;
  const stock = product?.stock ?? 0;
  const badge = product?.badge || "";
  const soldOut = stock <= 0;

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl bg-card shadow-card transition-all hover:-translate-y-1 hover:shadow-glow">
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={name}
            loading="lazy"
            className={`h-full w-full object-cover transition-transform duration-700 group-hover:scale-105 ${
              soldOut ? "opacity-40 grayscale" : ""
            }`}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
            sem imagem
          </div>
        )}
        {soldOut ? (
          <span className="absolute left-3 top-3 rounded-full bg-foreground/85 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-background shadow-soft">
            Esgotado
          </span>
        ) : (
          badge && (
            <span className="absolute left-3 top-3 rounded-full bg-cherry px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-cherry-foreground shadow-soft">
              {badge}
            </span>
          )
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-5">
        <div>
          <h3 className="font-display text-lg leading-tight text-card-foreground">{name}</h3>
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground line-clamp-2">
            {description}
          </p>
        </div>

        <div className="mt-auto flex items-end justify-between pt-2">
          <div>
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground">A partir de</span>
            <div className="font-display text-2xl text-primary">{formatBRL(price)}</div>
          </div>
          <button
            onClick={() => add(product)}
            disabled={soldOut}
            aria-label={`Adicionar ${name} ao carrinho`}
            className="group/btn inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:bg-gradient-warm hover:shadow-soft active:scale-95 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground disabled:hover:bg-muted disabled:hover:shadow-none disabled:active:scale-100"
          >
            <Plus className="h-4 w-4 transition-transform group-hover/btn:rotate-90" />
            {soldOut ? "Esgotado" : "Adicionar"}
          </button>
        </div>
      </div>
    </article>
  );
}
