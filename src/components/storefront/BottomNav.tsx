import { Home, Receipt } from "lucide-react";
import { formatBRL, useCart } from "@/lib/cart-context";

export function BottomNav({ onOrders }: { onOrders: () => void }) {
  const { count, total } = useCart();

  return (
    <>
      {count > 0 && (
        <button
          onClick={onOrders}
          className="fixed inset-x-0 bottom-[68px] z-40 mx-auto flex max-w-3xl items-center justify-between gap-3 bg-brand px-5 py-3 text-sm font-semibold text-brand-foreground shadow-glow sm:bottom-[72px] sm:mb-2 sm:rounded-2xl"
        >
          <span>
            Ver carrinho · {count} {count === 1 ? "item" : "itens"}
          </span>
          <span className="font-display">{formatBRL(total)}</span>
        </button>
      )}

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card">
        <div className="mx-auto grid max-w-3xl grid-cols-2">
          <a
            href="#top"
            className="flex flex-col items-center gap-1 py-3 text-[11px] font-semibold text-brand"
          >
            <Home className="h-5 w-5" />
            Início
          </a>
          <button
            onClick={onOrders}
            className="relative flex flex-col items-center gap-1 py-3 text-[11px] font-semibold text-muted-foreground transition-colors hover:text-foreground"
          >
            <span className="relative">
              <Receipt className="h-5 w-5" />
              {count > 0 && (
                <span className="absolute -right-2.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-bold text-brand-foreground">
                  {count}
                </span>
              )}
            </span>
            Pedidos
          </button>
        </div>
      </nav>
    </>
  );
}
