import { formatBRL } from "@/lib/cart-context";

export function StoreInfoBar({
  minOrder = 20,
  onProfile,
}: {
  minOrder?: number;
  onProfile?: () => void;
}) {
  return (
    <div className="border-b border-border bg-card">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-3">
        <span className="min-w-0 truncate text-xs text-muted-foreground sm:text-sm">
          Pedido mín. {formatBRL(minOrder)}
        </span>
        <button
          type="button"
          onClick={onProfile}
          className="shrink-0 text-xs font-semibold text-brand hover:underline sm:text-sm"
        >
          Perfil da loja
        </button>
      </div>
    </div>
  );
}
