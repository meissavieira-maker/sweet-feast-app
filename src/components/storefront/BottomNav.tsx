import { Home, Receipt, ShoppingBag } from "lucide-react";
import { formatBRL, useCart } from "@/lib/cart-context";

export function BottomNav({ onOrders }: { onOrders: () => void }) {
  const { count, total } = useCart();

  return (
    <>
      {count > 0 && (
        <button
          type="button"
          onClick={onOrders}
          className="fixed inset-x-3 bottom-[76px] z-40 mx-auto flex max-w-3xl items-center justify-between gap-3 rounded-2xl border border-white/10 bg-brand px-4 py-3.5 text-sm font-semibold text-brand-foreground shadow-glow transition-transform hover:-translate-y-0.5 sm:bottom-[84px] sm:px-5"
        >
          <span className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10"><ShoppingBag className="h-4 w-4" /></span>
            <span className="text-left">
              <span className="block">{count} {count === 1 ? "item no carrinho" : "itens no carrinho"}</span>
              <span className="block text-[10px] font-medium text-brand-foreground/70">Toque para finalizar</span>
            </span>
          </span>
          <span className="flex items-center gap-2 font-display text-lg">{formatBRL(total)} <span aria-hidden="true">→</span></span>
        </button>
      )}

      <nav aria-label="Navegação principal" className="fixed inset-x-0 bottom-0 z-40 border-t border-border/80 bg-card/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_26px_-20px_rgba(0,0,0,0.35)] backdrop-blur-xl">
        <div className="mx-auto grid max-w-3xl grid-cols-2 px-3">
          <a
            href="#top"
            className="flex flex-col items-center gap-1 py-3 text-[11px] font-semibold text-brand transition-colors"
          >
            <span className="flex h-8 w-12 items-center justify-center rounded-xl bg-accent"><Home className="h-[18px] w-[18px]" /></span>
            Início
          </a>
          <button
            type="button"
            onClick={onOrders}
            className="relative flex flex-col items-center gap-1 py-3 text-[11px] font-semibold text-muted-foreground transition-colors hover:text-foreground"
          >
            <span className="relative flex h-8 w-12 items-center justify-center rounded-xl">
              <Receipt className="h-[18px] w-[18px]" />
              {count > 0 && <span className="absolute right-2 top-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-cherry px-1 text-[10px] font-bold text-cherry-foreground">{count}</span>}
            </span>
            Carrinho e pedidos
          </button>
        </div>
      </nav>
    </>
  );
}
