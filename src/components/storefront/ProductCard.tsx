import type { Product } from "@/lib/products";
import { formatBRL, useCart } from "@/lib/cart-context";

/** Horizontal list row: text on the left, square photo on the right. */
export function ProductRow({ product }: { product: Product }) {
  const { add } = useCart();
  const soldOut = product.stock <= 0;

  return (
    <button
      onClick={() => !soldOut && add(product)}
      disabled={soldOut}
      className="flex w-full items-start gap-4 py-4 text-left transition-opacity disabled:opacity-60"
    >
      <div className="min-w-0 flex-1">
        <h3 className="truncate text-sm font-bold text-foreground sm:text-base">{product.name}</h3>
        <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground sm:text-sm">
          {product.description}
        </p>
        <p className="mt-2 text-sm font-bold text-brand sm:text-base">
          {soldOut ? "Esgotado" : formatBRL(product.price)}
        </p>
      </div>

      <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-muted sm:h-28 sm:w-28">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            loading="lazy"
            className={`h-full w-full object-cover ${soldOut ? "grayscale" : ""}`}
          />
        ) : null}
        {soldOut && (
          <span className="absolute inset-x-0 bottom-0 bg-ink/80 py-1 text-center text-[10px] font-semibold uppercase text-ink-foreground">
            Esgotado
          </span>
        )}
      </div>
    </button>
  );
}

/** Square card used inside the "Os mais pedidos" carousel. */
export function ProductHighlightCard({ product }: { product: Product }) {
  const { add } = useCart();
  const soldOut = product.stock <= 0;

  return (
    <button
      onClick={() => !soldOut && add(product)}
      disabled={soldOut}
      className="w-36 shrink-0 text-left sm:w-40 disabled:opacity-60"
    >
      <div className="relative aspect-square overflow-hidden rounded-xl bg-muted shadow-soft">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            loading="lazy"
            className={`h-full w-full object-cover ${soldOut ? "grayscale" : ""}`}
          />
        ) : null}
        {soldOut && (
          <span className="absolute inset-x-0 bottom-0 bg-ink/80 py-1 text-center text-[10px] font-semibold uppercase text-ink-foreground">
            Esgotado
          </span>
        )}
      </div>
      <p className="mt-2 line-clamp-2 text-xs font-bold leading-snug text-foreground sm:text-sm">
        {product.name}
      </p>
      <p className="mt-0.5 text-xs font-bold text-brand sm:text-sm">{formatBRL(product.price)}</p>
    </button>
  );
}
