import { Minus, Plus, Trash2, Bike, Store, ArrowRight, Loader2, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { formatBRL, useCart } from "@/lib/cart-context";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";

const DELIVERY_CITIES = [
  { id: "cachoeira", label: "Cachoeira", fee: 7 },
  { id: "sao-felix", label: "São Félix", fee: 8 },
  { id: "capoeirucu", label: "Capoeiruçu", fee: 20 },
  { id: "muritiba", label: "Muritiba", fee: 20 },
] as const;

export function CartModal({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { items, setQty, remove, total, count, clear } = useCart();
  const [mode, setMode] = useState<"entrega" | "retirada">("entrega");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [cityId, setCityId] = useState<string>("");
  const [address, setAddress] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  const selectedCity = DELIVERY_CITIES.find((c) => c.id === cityId);
  const deliveryFee = mode === "entrega" ? (selectedCity?.fee ?? 0) : 0;
  const finalTotal = total + deliveryFee;

  async function handleCheckout() {
    if (!name.trim()) {
      toast.error("Informe seu nome");
      return;
    }
    if (mode === "entrega" && !address.trim()) {
      toast.error("Informe o endereço de entrega");
      return;
    }
    setSubmitting(true);
    const { data, error } = await supabase.rpc("place_order", {
      _customer_name: name.trim(),
      _customer_phone: phone.trim(),
      _mode: mode,
      _address: mode === "entrega" ? address.trim() : "",
      _delivery_fee: deliveryFee,
      _items: items.map((i) => ({ product_id: i.product.id, quantity: i.qty })),
    });
    setSubmitting(false);

    if (error) {
      toast.error(error.message || "Não foi possível concluir o pedido");
      return;
    }
    setSuccess(typeof data === "string" ? data : "ok");
    clear();
  }

  function handleClose(v: boolean) {
    if (!v) {
      setSuccess(null);
      setName("");
      setPhone("");
      setAddress("");
    }
    onOpenChange(v);
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg gap-0 overflow-hidden rounded-3xl border-border bg-card p-0">
        <div className="border-b border-border px-6 py-4">
          <DialogTitle className="font-display text-xl text-card-foreground">
            {success ? "Pedido confirmado" : "Seu Carrinho"}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {success
              ? "Em instantes a doçaria começa a preparar."
              : `${count} ${count === 1 ? "item adicionado" : "itens adicionados"}`}
          </DialogDescription>
        </div>

        {success ? (
          <div className="px-6 py-10 text-center">
            <CheckCircle2 className="mx-auto h-14 w-14 text-primary" />
            <p className="mt-4 font-display text-lg text-card-foreground">Obrigado, {name || "cliente"}!</p>
            <p className="mt-1 text-sm text-muted-foreground">Você receberá atualizações pelo telefone informado.</p>
            <button
              onClick={() => handleClose(false)}
              className="mt-6 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground"
            >
              Continuar comprando
            </button>
          </div>
        ) : (
          <>
            <div className="max-h-[36vh] overflow-y-auto px-6 py-5">
              {items.length === 0 ? (
                <p className="py-10 text-center text-sm text-muted-foreground">
                  Seu carrinho está vazio. Adicione uma delícia! 🍰
                </p>
              ) : (
                <ul className="space-y-4">
                  {items.map(({ product, qty }) => (
                    <li key={product.id} className="flex gap-3">
                      <img
                        src={product.image_url}
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
                    active={mode === "entrega"}
                    onClick={() => setMode("entrega")}
                    icon={<Bike className="h-4 w-4" />}
                    label="Entrega"
                    hint={total >= 80 ? "Frete grátis" : "R$ 8,90"}
                  />
                  <ModeButton
                    active={mode === "retirada"}
                    onClick={() => setMode("retirada")}
                    icon={<Store className="h-4 w-4" />}
                    label="Retirada"
                    hint="Sem taxa"
                  />
                </div>

                <div className="mt-4 space-y-2">
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Seu nome"
                    maxLength={120}
                    className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm outline-none focus:border-primary"
                  />
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Telefone / WhatsApp"
                    maxLength={30}
                    className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm outline-none focus:border-primary"
                  />
                  {mode === "entrega" && (
                    <input
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Endereço de entrega"
                      maxLength={240}
                      className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm outline-none focus:border-primary"
                    />
                  )}
                </div>

                <dl className="mt-4 space-y-1.5 text-sm">
                  <div className="flex justify-between text-muted-foreground">
                    <dt>Subtotal</dt>
                    <dd>{formatBRL(total)}</dd>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <dt>{mode === "entrega" ? "Entrega" : "Retirada"}</dt>
                    <dd>{deliveryFee === 0 ? "Grátis" : formatBRL(deliveryFee)}</dd>
                  </div>
                  <div className="flex justify-between pt-2 text-base font-semibold text-foreground">
                    <dt>Total</dt>
                    <dd className="font-display text-xl text-primary">{formatBRL(finalTotal)}</dd>
                  </div>
                </dl>

                <button
                  disabled={submitting}
                  onClick={handleCheckout}
                  className="mt-5 group flex w-full items-center justify-center gap-2 rounded-full bg-cherry px-6 py-4 text-base font-semibold text-cherry-foreground shadow-glow transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-60"
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Confirmar Pedido
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </button>
              </div>
            )}
          </>
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
