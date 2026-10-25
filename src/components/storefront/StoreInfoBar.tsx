import { Info, UserRound } from "lucide-react";
import { formatBRL } from "@/lib/cart-context";

export function StoreInfoBar({
  minOrder = 20,
  onProfile,
}: {
  minOrder?: number;
  onProfile?: () => void;
}) {
  return (
    <div className="border-b border-border/80 bg-card/95 backdrop-blur-xl">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
            <Info className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Pedido mínimo</p>
            <p className="text-sm font-bold tabular-nums text-foreground">{formatBRL(minOrder)}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onProfile}
          className="inline-flex shrink-0 items-center gap-2 rounded-full border border-border bg-background px-3.5 py-2 text-xs font-semibold text-foreground transition-all hover:border-primary/40 hover:bg-accent hover:text-accent-foreground sm:text-sm"
        >
          <UserRound className="h-4 w-4" />
          Perfil da loja
        </button>
      </div>
    </div>
  );
}
