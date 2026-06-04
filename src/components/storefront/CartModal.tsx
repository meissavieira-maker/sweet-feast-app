import { Minus, Plus, Trash2, Bike, Store, ArrowRight, Loader2, CheckCircle2, MapPin } from "lucide-react";
import { useState } from "react";
import { formatBRL, useCart, type CartItem } from "@/lib/cart-context";
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

const PICKUP_ADDRESS = "Rua Rodrigo Brandão, Número 32, Cachoeira - BA";
const WHATSAPP_PHONE = "5575991074216"; // +55 (75) 99107-4216

type SuccessInfo = {
  orderId: string;
  name: string;
  mode: "entrega" | "retirada";
  address: string;
  items: CartItem[];
  total: number;
};

export function CartModal({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { items, setQty, remove, total, count, clear } = useCart();
  const [mode, setMode] = useState<"entrega" | "retirada">("entrega");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [cityId, setCityId] = useState<string>("");
  const [address, setAddress] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<SuccessInfo | null>(null);

  const selectedCity = DELIVERY_CITIES.find((c) => c.id === cityId);
  const deliveryFee = mode === "entrega" ? (selectedCity?.fee ?? 0) : 0;
  const finalTotal = total + deliveryFee;

  async function handleCheckout() {
    if (!name.trim()) {
      toast.error("Informe seu nome");
      return;
    }
    if (mode === "entrega") {
      if (!selectedCity) {
        toast.error("Selecione a cidade de entrega");
        return;
      }
      if (!address.trim()) {
        toast.error("Informe o endereço de entrega");
        return;
      }
    }
    setSubmitting(true);
    const fullAddress =
      mode === "entrega" && selectedCity
        ? `${address.trim()} — ${selectedCity.label}`
        : PICKUP_ADDRESS;
    const snapshotItems = items.map((i) => ({ ...i }));
    const snapshotTotal = finalTotal;
    const { data, error } = await supabase.rpc("place_order", {
      _customer_name: name.trim(),
      _customer_phone: phone.trim(),
      _mode: mode,
      _address: fullAddress,
      _delivery_fee: deliveryFee,
      _items: items.map((i) => ({ product_id: i.product.id, quantity: i.qty })),
    });
    setSubmitting(false);

    if (error) {
      toast.error(error.message || "Não foi possível concluir o pedido");
      return;
    }
    const orderId = typeof data === "string" ? data : "";
    setSuccess({
      orderId,
      name: name.trim(),
      mode,
      address: fullAddress,
      items: snapshotItems,
      total: snapshotTotal,
    });
    clear();
  }

  function handleClose(v: boolean) {
    if (!v) {
      setSuccess(null);
      setName("");
      setPhone("");
      setAddress("");
      setCityId("");
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
          <div className="px-6 py-8 text-center">
            <CheckCircle2 className="mx-auto h-14 w-14 text-primary" />
            <p className="mt-4 font-display text-lg text-card-foreground">
              Obrigado, {success.name || "cliente"}!
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Pedido <span className="font-mono text-foreground">#{success.orderId.slice(0, 8).toUpperCase()}</span> registrado.
            </p>

            {success.mode === "retirada" && (
              <div className="mx-auto mt-5 max-w-sm rounded-2xl border border-border bg-secondary/50 p-4 text-left">
                <div className="flex items-start gap-2">
                  <MapPin className="mt-0.5 h-4 w-4 text-primary" />
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                      Endereço para retirada
                    </p>
                    <p className="mt-1 text-sm text-card-foreground">{PICKUP_ADDRESS}</p>
                  </div>
                </div>
              </div>
            )}

            <a
              href={buildWhatsAppLink(success)}
              target="_blank"
              rel="noreferrer"
              className="mt-6 inline-flex w-full max-w-sm items-center justify-center gap-2 rounded-full bg-[#25D366] px-6 py-4 text-base font-semibold text-white shadow-glow transition hover:brightness-110"
            >
              <WhatsAppIcon className="h-5 w-5" />
              Enviar Comanda para o WhatsApp
            </a>

            <button
              onClick={() => handleClose(false)}
              className="mt-3 rounded-full px-6 py-2 text-sm font-medium text-muted-foreground hover:text-primary"
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
                    hint={selectedCity ? formatBRL(selectedCity.fee) : "Motoboy"}
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
                    <>
                      <select
                        value={cityId}
                        onChange={(e) => setCityId(e.target.value)}
                        required
                        className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm outline-none focus:border-primary"
                      >
                        <option value="">Selecione a cidade de entrega…</option>
                        {DELIVERY_CITIES.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.label} — {formatBRL(c.fee)}
                          </option>
                        ))}
                      </select>
                      <input
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="Endereço (rua, número, bairro, referência)"
                        maxLength={240}
                        className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm outline-none focus:border-primary"
                      />
                    </>
                  )}
                  {mode === "retirada" && (
                    <div className="rounded-xl border border-border bg-card p-3">
                      <div className="flex items-start gap-2">
                        <MapPin className="mt-0.5 h-4 w-4 text-primary" />
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                            Endereço para retirada
                          </p>
                          <p className="mt-0.5 text-sm text-card-foreground">{PICKUP_ADDRESS}</p>
                        </div>
                      </div>
                    </div>
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

function buildWhatsAppLink(s: SuccessInfo) {
  const shortId = s.orderId ? s.orderId.slice(0, 8).toUpperCase() : "—";
  const modoLabel = s.mode === "entrega" ? "Entrega (Motoboy)" : "Retirada no Local";
  const itensTxt = s.items
    .map((i) => `• ${i.qty}x ${i.product.name} — ${formatBRL(i.product.price * i.qty)}`)
    .join("\n");
  const enderecoLinha =
    s.mode === "entrega"
      ? `📍 Endereço de entrega: ${s.address}`
      : `📍 Retirada em: ${PICKUP_ADDRESS}`;
  const msg = [
    `*Comanda — Meissa Vieira Confeitaria*`,
    ``,
    `Pedido: *#${shortId}*`,
    `Status: *[PAGO]*`,
    `Cliente: ${s.name}`,
    `Envio: *${modoLabel}*`,
    enderecoLinha,
    ``,
    `*Itens:*`,
    itensTxt,
    ``,
    `*Total: ${formatBRL(s.total)}*`,
  ].join("\n");
  return `https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(msg)}`;
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M.057 24l1.687-6.163a11.867 11.867 0 01-1.587-5.946C.16 5.335 5.495 0 12.05 0a11.82 11.82 0 018.413 3.488 11.82 11.82 0 013.48 8.414c-.003 6.554-5.338 11.89-11.893 11.89a11.9 11.9 0 01-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 001.51 5.26l-.999 3.648 3.978-.607zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.149-.174.198-.298.298-.496.099-.198.05-.372-.025-.521-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.71.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.247-.694.247-1.289.173-1.413z"/>
    </svg>
  );
}
