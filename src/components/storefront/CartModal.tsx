import { Minus, Plus, Trash2, Bike, Store, ArrowRight } from "lucide-react";
import { useState } from "react";
import { formatBRL, useCart } from "@/lib/cart-context";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export function CartModal({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { items, setQty, remove, total, count } = useCart();
  const [mode, setMode] = useState<"delivery" | "pickup">("delivery");
  const deliveryFee = mode === "delivery" ? (total >= 80 ? 0 : 8.9) : 0;
  const finalTotal = total + deliveryFee;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg gap-0 overflow-hidden rounded-3xl border-border bg-card p-0">
        <div className="border-b border-border px-6 py-4">
          <DialogTitle className="font-display text-xl text-card-foreground">Seu Carrinho</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {count} {count === 1 ? "item adicionado" : "itens adicionados"}
          </DialogDescription>
        </div>

        <div className="max-h-[42vh] overflow-y-auto px-6 py-5">
          {items.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Seu carrinho está vazio. Adicione uma delícia! 🍰
            </p>
          ) : (
            <ul className="space-y-4">
              {items.map(({ product, qty }) => (
                <li key={product.id} className="flex gap-3">
                  <img
                    src={product.image}
                    alt={product.name}
                    className="h-16 w-16 rounded-xl object-cover"
                  />
                  <div className="flex flex-1 flex-col">
                    <div className="flex justify-between gap-2">
                      <span className="text-sm font-medium leading-tight text-card-foreground">
                        {product.name}
                      </span>
                      <button
                        onClick={() => remove(product.id)}
                        className="text-muted-foreground hover:text-destructive"
                        aria-label="Remover"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <span className="mt-1 text-xs text-muted-foreground">{formatBRL(product.price)}</span>
                    <div className="mt-2 flex items-center justify-between">
                      <div className="inline-flex items-center rounded-full bg-secondary">
                        <button
                          onClick={() => setQty(product.id, qty - 1)}
                          className="p-2 text-secondary-foreground hover:text-primary"
                          aria-label="Diminuir"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="w-6 text-center text-sm font-medium">{qty}</span>
                        <button
                          onClick={() => setQty(product.id, qty + 1)}
                          className="p-2 text-secondary-foreground hover:text-primary"
                          aria-label="Aumentar"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <span className="font-display text-base text-primary">
                        {formatBRL(product.price * qty)}
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {items.length > 0 && (
          <div className="border-t border-border bg-secondary/40 px-6 py-5">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              Como você quer receber?
            </p>
            <div className="grid grid-cols-2 gap-2">
              <ModeButton
                active={mode === "delivery"}
                onClick={() => setMode("delivery")}
                icon={<Bike className="h-4 w-4" />}
                label="Entrega"
                hint={total >= 80 ? "Frete grátis" : "R$ 8,90"}
              />
              <ModeButton
                active={mode === "pickup"}
                onClick={() => setMode("pickup")}
                icon={<Store className="h-4 w-4" />}
                label="Retirada"
                hint="Sem taxa"
              />
            </div>

            <dl className="mt-4 space-y-1.5 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <dt>Subtotal</dt>
                <dd>{formatBRL(total)}</dd>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <dt>{mode === "delivery" ? "Entrega" : "Retirada"}</dt>
                <dd>{deliveryFee === 0 ? "Grátis" : formatBRL(deliveryFee)}</dd>
              </div>
              <div className="flex justify-between pt-2 text-base font-semibold text-foreground">
                <dt>Total</dt>
                <dd className="font-display text-xl text-primary">{formatBRL(finalTotal)}</dd>
              </div>
            </dl>

            <button className="mt-5 group flex w-full items-center justify-center gap-2 rounded-full bg-cherry px-6 py-4 text-base font-semibold text-cherry-foreground shadow-glow transition-all hover:brightness-110 active:scale-[0.98]">
              Ir para o Pagamento
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ModeButton({
  active,
  onClick,
  icon,
  label,
  hint,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  hint: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition-all ${
        active
          ? "border-primary bg-primary text-primary-foreground shadow-soft"
          : "border-border bg-card hover:border-primary/40"
      }`}
    >
      <div className="flex items-center gap-2 text-sm font-semibold">
        {icon}
        {label}
      </div>
      <span className={`text-[11px] ${active ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
        {hint}
      </span>
    </button>
  );
}
