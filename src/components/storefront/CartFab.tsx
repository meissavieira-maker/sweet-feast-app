import { ShoppingBag } from "lucide-react";
import { useEffect, useState } from "react";
import { formatBRL, useCart } from "@/lib/cart-context";

export function CartFab({ onOpen }: { onOpen: () => void }) {
  const { count, total } = useCart();
  const [bounce, setBounce] = useState(false);

  useEffect(() => {
    if (count === 0) return;
    setBounce(true);
    const t = setTimeout(() => setBounce(false), 500);
    return () => clearTimeout(t);
  }, [count]);

  return (
    <button
      onClick={onOpen}
      className={`fixed bottom-5 left-1/2 z-40 flex -translate-x-1/2 items-center gap-3 rounded-full bg-gradient-warm px-5 py-3.5 text-primary-foreground shadow-glow transition-all hover:scale-[1.02] sm:bottom-8 ${
        bounce ? "animate-cart-bounce" : ""
      }`}
    >
      <div className="relative">
        <ShoppingBag className="h-5 w-5" />
        {count > 0 && (
          <span className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-cherry px-1 text-[11px] font-bold text-cherry-foreground ring-2 ring-primary">
            {count}
          </span>
        )}
      </div>
      <span className="text-sm font-semibold">Meu Carrinho</span>
      <span className="text-sm font-display border-l border-white/20 pl-3">
        {formatBRL(total)}
      </span>
    </button>
  );
}
