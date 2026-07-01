import { Minus, Plus, Trash2, Bike, Store, ArrowRight, Loader2, CheckCircle2, MapPin, Copy, QrCode, CreditCard, Lock, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { formatBRL, useCart, type CartItem } from "@/lib/cart-context";
import { supabase } from "@/integrations/supabase/client";
import { createCardPayment, getPublicConfig } from "@/lib/payments.functions";
import type { Product } from "@/lib/products";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { useStoreStatus } from "@/hooks/use-store-status";
import { useHeroSettings, DEFAULT_WHATSAPP_TEMPLATE } from "@/hooks/use-hero-settings";

const CALDA_OPTIONS = [
  { id: "chocolate", label: "Calda de Chocolate" },
  { id: "ninho", label: "Calda de Ninho" },
  { id: "sem", label: "Sem Calda" },
] as const;
type CaldaId = (typeof CALDA_OPTIONS)[number]["id"];

const DELIVERY_CITIES = [
  { id: "cachoeira", label: "Cachoeira", fee: 7 },
  { id: "sao-felix", label: "São Félix", fee: 8 },
  { id: "capoeirucu", label: "Capoeiruçu", fee: 20 },
  { id: "muritiba", label: "Muritiba", fee: 20 },
] as const;

const PICKUP_ADDRESS = "Rua Rodrigo Brandão, Número 32, Cachoeira - BA";
const WHATSAPP_PHONE = "5575991074216";
const PIX_KEY = "meissavieira@hotmail.com";
const PIX_BENEFICIARY = "Meissa Vieira dos Santos Mendes";
const CLOSED_MESSAGE =
  "Pedidos do Festival de Tortas suspensos temporariamente. Lembrando que as entregas e retiradas ocorrerão neste domingo a partir das 14h!";

type PaymentMethod = "pix" | "card";

type SuccessInfo = {
  orderId: string;
  name: string;
  phone: string;
  mode: "entrega" | "retirada";
  address: string;
  items: CartItem[];
  total: number;
  calda: string;
};


type PixInfo = {
  payment_id: string;
  qr_code: string;
  qr_code_base64: string;
  ticket_url: string;
};

declare global {
  interface Window {
    MercadoPago?: new (publicKey: string, options?: { locale?: string }) => {
      bricks: () => {
        create: (
          type: string,
          containerId: string,
          settings: Record<string, unknown>,
        ) => Promise<{ unmount: () => void }>;
      };
    };
  }
}

function loadMpSdk(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.MercadoPago) return Promise.resolve();
  const existing = document.querySelector<HTMLScriptElement>("script[data-mp-sdk]");
  if (existing) {
    return new Promise((resolve, reject) => {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Falha ao carregar SDK do Mercado Pago")));
    });
  }
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://sdk.mercadopago.com/js/v2";
    s.async = true;
    s.dataset.mpSdk = "1";
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Falha ao carregar SDK do Mercado Pago"));
    document.head.appendChild(s);
  });
}

export function CartModal({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { items, setQty, remove, add, total, count, clear } = useCart();
  const { isOpen: storeOpen } = useStoreStatus();
  const { data: heroSettings } = useHeroSettings();
  const [bumps, setBumps] = useState<{ pudim: Product | null; caseirinho: Product | null }>({ pudim: null, caseirinho: null });
  const [mode, setMode] = useState<"entrega" | "retirada">("entrega");
  const [method, setMethod] = useState<PaymentMethod>("pix");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [cityId, setCityId] = useState<string>("");
  const [address, setAddress] = useState("");
  const [calda, setCalda] = useState<CaldaId | "">("");
  const [submitting, setSubmitting] = useState(false);
  const [pix, setPix] = useState<PixInfo | null>(null);
  const [pending, setPending] = useState<SuccessInfo | null>(null);
  const [success, setSuccess] = useState<SuccessInfo | null>(null);
  
  const [cardStage, setCardStage] = useState<null | "loading" | "ready" | "processing">(null);
  const [cardError, setCardError] = useState<string | null>(null);
  const brickRef = useRef<{ unmount: () => void } | null>(null);

  const selectedCity = DELIVERY_CITIES.find((c) => c.id === cityId);
  const deliveryFee = mode === "entrega" ? (selectedCity?.fee ?? 0) : 0;
  const finalTotal = total + deliveryFee;

  // Manual PIX flow — no automatic polling.

  // Mount the Mercado Pago Card Brick when entering card stage
  useEffect(() => {
    if (cardStage !== "loading" || !pending) return;
    let cancelled = false;
    (async () => {
      try {
        const cfg = await getPublicConfig();
        if (!cfg.mp_public_key) {
          throw new Error("Chave pública do Mercado Pago não configurada nas Configurações do admin.");
        }
        await loadMpSdk();
        if (cancelled || !window.MercadoPago) return;
        const mp = new window.MercadoPago(cfg.mp_public_key, { locale: "pt-BR" });
        const builder = mp.bricks();
        // Reset container
        const container = document.getElementById("cardPaymentBrick_container");
        if (container) container.innerHTML = "";
        brickRef.current = await builder.create("cardPayment", "cardPaymentBrick_container", {
          initialization: { amount: Number(pending.total.toFixed(2)) },
          customization: {
            visual: { style: { theme: "default" } },
            paymentMethods: { maxInstallments: 1, minInstallments: 1 },
          },
          callbacks: {
            onReady: () => {
              if (!cancelled) setCardStage("ready");
            },
            onError: (err: unknown) => {
              const msg = (err as { message?: string })?.message ?? "Erro no formulário do cartão";
              setCardError(msg);
            },
            onSubmit: async (cardFormData: {
              token: string;
              issuer_id?: string;
              payment_method_id: string;
              installments: number;
              payer: { email: string; identification?: { type: string; number: string } };
            }) => {
              setCardStage("processing");
              setCardError(null);
              try {
                const r = await createCardPayment({
                  data: {
                    order_id: pending.orderId,
                    amount: pending.total,
                    description: `Pedido #${pending.orderId.slice(0, 8).toUpperCase()} — Meissa Vieira`,
                    token: cardFormData.token,
                    payment_method_id: cardFormData.payment_method_id,
                    issuer_id: cardFormData.issuer_id ?? null,
                    installments: 1,
                    payer: {
                      email: cardFormData.payer.email,
                      identification: cardFormData.payer.identification ?? null,
                    },
                  },
                });
                if (r.status === "approved") {
                  setSuccess(pending);
                  setCardStage(null);
                  brickRef.current?.unmount();
                  brickRef.current = null;
                } else if (r.status === "in_process" || r.status === "pending") {
                  setCardError("Pagamento em análise. Você será notificado assim que aprovado.");
                  setCardStage("ready");
                } else {
                  setCardError(`Pagamento recusado (${r.status_detail || r.status}). Tente outro cartão.`);
                  setCardStage("ready");
                }
              } catch (e: unknown) {
                setCardError(e instanceof Error ? e.message : "Falha ao processar cartão");
                setCardStage("ready");
              }
            },
          },
        });
      } catch (e: unknown) {
        if (!cancelled) {
          setCardError(e instanceof Error ? e.message : "Não foi possível iniciar o pagamento por cartão");
          setCardStage("ready");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [cardStage, pending]);

  // Unmount brick on close
  useEffect(() => {
    if (!open && brickRef.current) {
      try { brickRef.current.unmount(); } catch { /* noop */ }
      brickRef.current = null;
    }
  }, [open]);
  // Fetch order-bump suggestions (one Pudim + one Caseirinho) when modal opens
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("products")
        .select("id, category, name, description, price, image_url, stock, badge")
        .eq("active", true)
        .gt("stock", 0);
      if (cancelled || !data) return;
      const pudim = data.find((p) => /pudim|pudins/i.test(p.name)) ?? null;
      const caseirinho = data.find((p) => /caseirinho/i.test(p.name)) ?? null;
      setBumps({ pudim: pudim as Product | null, caseirinho: caseirinho as Product | null });
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  function toggleBump(p: Product | null) {
    if (!p) return;
    const inCart = items.some((i) => i.product.id === p.id);
    if (inCart) remove(p.id);
    else add(p);
  }


  async function handleCheckout() {
    if (!storeOpen) {
      toast.error(CLOSED_MESSAGE);
      return;
    }
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
    if (!calda) {
      toast.error("Escolha a calda do seu pedido");
      return;
    }
    const caldaLabel = CALDA_OPTIONS.find((c) => c.id === calda)?.label ?? "Sem Calda";
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
      _notes: `Calda escolhida: ${caldaLabel}`,
    });

    if (error) {
      setSubmitting(false);
      toast.error(error.message || "Não foi possível concluir o pedido");
      return;
    }
    const orderId = typeof data === "string" ? data : "";
    const pendingInfo: SuccessInfo = {
      orderId,
      name: name.trim(),
      phone: phone.trim(),
      mode,
      address: fullAddress,
      items: snapshotItems,
      total: snapshotTotal,
      calda: caldaLabel,
    };


    try {
      if (method === "pix") {
        // Manual PIX: no Mercado Pago API call — show static recipient key.
        setPending(pendingInfo);
        setPix({ payment_id: "", qr_code: "", qr_code_base64: "", ticket_url: "" });
        clear();
      } else {
        // Card → open brick
        setPending(pendingInfo);
        setCardStage("loading");
        setCardError(null);
        clear();
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Falha ao iniciar pagamento";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  function handleConfirmPaid() {
    if (!pending) return;
    setSuccess(pending);
    setPix(null);
  }

  function copyPix() {
    navigator.clipboard.writeText(PIX_KEY).then(() => toast.success("Copiado!"));
  }

  function handleClose(v: boolean) {
    if (!v) {
      if (brickRef.current) {
        try { brickRef.current.unmount(); } catch { /* noop */ }
        brickRef.current = null;
      }
      setSuccess(null);
      setPix(null);
      setPending(null);
      setCardStage(null);
      setCardError(null);
      setName("");
      setPhone("");
      setAddress("");
      setCityId("");
      setCalda("");
      setMethod("pix");
    }
    onOpenChange(v);
  }

  const showCard = cardStage !== null && !success;
  const showPix = !!pix && !success && !showCard;
  const showCart = !success && !showPix && !showCard;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="flex h-[100dvh] max-h-[100dvh] w-full max-w-lg flex-col gap-0 overflow-hidden rounded-none border-border bg-card p-0 sm:h-auto sm:max-h-[90vh] sm:rounded-3xl">
        <div className="shrink-0 border-b border-border px-5 py-3 sm:px-6 sm:py-4">
          <DialogTitle className="font-display text-lg sm:text-xl text-card-foreground">
            {success
              ? "Pedido confirmado"
              : showPix
                ? "Pague com PIX"
                : showCard
                  ? "Pague com Cartão"
                  : "Seu Carrinho"}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {success
              ? "Em instantes a doçaria começa a preparar."
              : showPix
                ? "Escaneie o QR Code ou copie o código abaixo no seu app do banco."
                : showCard
                  ? "Formulário seguro do Mercado Pago — seus dados não passam por nós."
                  : `${count} ${count === 1 ? "item adicionado" : "itens adicionados"}`}
          </DialogDescription>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain">

        {showPix && (
          <div className="px-6 py-6 text-center">
            <div className="mx-auto inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              <QrCode className="h-3.5 w-3.5" /> PIX · Chave Manual
            </div>
            <p className="mt-4 font-display text-2xl text-primary">{formatBRL(pending?.total ?? 0)}</p>
            <p className="mt-1 text-xs text-muted-foreground">Total a transferir via PIX</p>

            <div className="mx-auto mt-5 max-w-sm rounded-2xl border border-border bg-secondary/40 p-5 text-left">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Tipo de chave
                </p>
                <p className="mt-0.5 text-sm font-medium text-card-foreground">E-mail</p>
              </div>
              <div className="mt-3">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Chave PIX
                </p>
                <p className="mt-0.5 break-all font-mono text-sm text-card-foreground">{PIX_KEY}</p>
              </div>
              <div className="mt-3">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Beneficiário
                </p>
                <p className="mt-0.5 text-sm text-card-foreground">{PIX_BENEFICIARY}</p>
              </div>
              <button
                onClick={copyPix}
                className="mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-primary px-3 py-2.5 text-xs font-semibold text-primary-foreground hover:brightness-110"
              >
                <Copy className="h-3.5 w-3.5" /> Copiar Chave PIX
              </button>
            </div>

            <button
              onClick={handleConfirmPaid}
              className="mt-5 inline-flex w-full max-w-sm items-center justify-center gap-2 rounded-full bg-cherry px-6 py-4 text-base font-semibold text-cherry-foreground shadow-glow hover:brightness-110"
            >
              <CheckCircle2 className="h-4 w-4" />
              Já paguei — Avançar para o WhatsApp
            </button>
            <p className="mt-2 text-[11px] text-muted-foreground">
              Após o pagamento, envie a comanda pelo WhatsApp para confirmarmos seu pedido.
            </p>
          </div>
        )}


        {showCard && (
          <div className="px-6 py-5">
            <div className="mb-3 flex items-center justify-between">
              <div className="inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                <Lock className="h-3 w-3" /> Pagamento seguro · Mercado Pago
              </div>
              <span className="font-display text-base text-primary">{formatBRL(pending?.total ?? 0)}</span>
            </div>
            {cardStage === "loading" && (
              <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando formulário…
              </div>
            )}
            <div id="cardPaymentBrick_container" className="min-h-[200px]" />
            {cardStage === "processing" && (
              <div className="mt-3 flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Processando pagamento…
              </div>
            )}
            {cardError && (
              <p className="mt-3 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
                {cardError}
              </p>
            )}
          </div>
        )}

        {success && (
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

            <button
              type="button"
              onClick={() => openWhatsAppOrder(success)}
              className="mt-6 inline-flex w-full max-w-sm items-center justify-center gap-2 rounded-full bg-[#25D366] px-6 py-4 text-base font-semibold text-white shadow-glow transition hover:brightness-110"
            >
              <WhatsAppIcon className="h-5 w-5" />
              Enviar Comanda para o WhatsApp
            </button>

            <button
              onClick={() => handleClose(false)}
              className="mt-3 rounded-full px-6 py-2 text-sm font-medium text-muted-foreground hover:text-primary"
            >
              Continuar comprando
            </button>
          </div>
        )}

        {showCart && (
          <>
            <div className="px-5 py-4 sm:px-6 sm:py-5">
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
              <div className="border-t border-border bg-secondary/40 px-5 py-4 sm:px-6 sm:py-5">
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

                <p className="mt-4 mb-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Forma de pagamento
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <ModeButton
                    active={method === "pix"}
                    onClick={() => setMethod("pix")}
                    icon={<QrCode className="h-4 w-4" />}
                    label="Pagar com PIX"
                    hint="Aprovação imediata"
                  />
                  <ModeButton
                    active={method === "card"}
                    onClick={() => setMethod("card")}
                    icon={<CreditCard className="h-4 w-4" />}
                    label="Pagar com Cartão"
                    hint="À vista"
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

                <div className="mt-4 rounded-xl border border-border bg-card p-3">
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                    Escolha a calda <span className="text-cherry">*</span>
                  </p>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    {CALDA_OPTIONS.map((c) => {
                      const active = calda === c.id;
                      return (
                        <label
                          key={c.id}
                          className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-all ${
                            active
                              ? "border-primary bg-primary/10 text-primary font-semibold"
                              : "border-border bg-background hover:border-primary/40"
                          }`}
                        >
                          <input
                            type="radio"
                            name="calda"
                            value={c.id}
                            checked={active}
                            onChange={() => setCalda(c.id)}
                            className="h-4 w-4 accent-primary"
                          />
                          {c.label}
                        </label>
                      );
                    })}
                  </div>
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

                {!storeOpen && (
                  <div className="mt-4 rounded-xl border border-rose-300/50 bg-rose-50 p-3 text-sm text-rose-900 dark:border-rose-500/30 dark:bg-rose-950/40 dark:text-rose-200">
                    <p className="font-semibold">🔴 Pedidos pausados</p>
                    <p className="mt-1 text-xs leading-relaxed">{CLOSED_MESSAGE}</p>
                  </div>
                )}

                {(bumps.pudim || bumps.caseirinho) && (
                  <div className="mt-5 rounded-2xl border-2 border-dashed border-cherry/60 bg-cherry/5 p-3 sm:p-4">
                    <div className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-cherry">
                      <Sparkles className="h-3.5 w-3.5" />
                      Oferta especial só agora
                    </div>
                    <p className="mb-3 text-xs text-muted-foreground">
                      Aproveite e adicione ao seu pedido com 1 clique:
                    </p>
                    <div className="space-y-2">
                      {bumps.pudim && (
                        <BumpRow
                          product={bumps.pudim}
                          checked={items.some((i) => i.product.id === bumps.pudim!.id)}
                          onToggle={() => toggleBump(bumps.pudim)}
                          label={`Aproveite para levar um ${bumps.pudim.name} por apenas ${formatBRL(bumps.pudim.price)}!`}
                        />
                      )}
                      {bumps.caseirinho && (
                        <BumpRow
                          product={bumps.caseirinho}
                          checked={items.some((i) => i.product.id === bumps.caseirinho!.id)}
                          onToggle={() => toggleBump(bumps.caseirinho)}
                          label={`Adicione um ${bumps.caseirinho.name} para o café da tarde por apenas ${formatBRL(bumps.caseirinho.price)}!`}
                        />
                      )}
                    </div>
                  </div>
                )}


                <button
                  disabled={submitting || !storeOpen}
                  onClick={handleCheckout}
                  className="mt-5 group flex w-full items-center justify-center gap-2 rounded-full bg-cherry px-6 py-4 text-base font-semibold text-cherry-foreground shadow-glow transition-all hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {storeOpen ? "Confirmar Pedido" : "Pedidos suspensos"}
                  {storeOpen && <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />}
                </button>
              </div>
            )}
          </>
        )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function BumpRow({
  product,
  checked,
  onToggle,
  label,
}: {
  product: Product;
  checked: boolean;
  onToggle: () => void;
  label: string;
}) {
  return (
    <label
      className={`flex cursor-pointer items-center gap-3 rounded-xl border p-2.5 transition-all ${
        checked
          ? "border-cherry bg-cherry/10 shadow-soft"
          : "border-border bg-card hover:border-cherry/50"
      }`}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={onToggle}
        className="h-5 w-5 shrink-0 accent-cherry"
      />
      <img
        src={product.image_url}
        alt={product.name}
        className="h-12 w-12 shrink-0 rounded-lg object-cover"
      />
      <div className="flex-1 text-xs leading-snug text-card-foreground sm:text-sm">
        {label}
      </div>
    </label>
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

function buildWhatsAppMessage(s: SuccessInfo) {
  const shortId = s.orderId ? s.orderId.slice(0, 8).toUpperCase() : "—";
  const modoLabel = s.mode === "entrega" ? "Entrega (Motoboy)" : "Retirada no Local";
  const endereco = s.mode === "entrega" ? s.address : PICKUP_ADDRESS;
  const itensTxt = s.items
    .map((i) => `🍰 ${i.qty}x ${i.product.name} — ${formatBRL(i.product.price * i.qty)}`)
    .join("\n");
  return [
    `🍰 *1º Festival de Fatias — Meissa Vieira* 🍰`,
    `-----------------------------------------`,
    `🆔 *Pedido:* #${shortId}`,
    `👤 *Cliente:* ${s.name}`,
    `📞 *WhatsApp:* ${s.phone || "—"}`,
    `🛵 *Forma de Envio:* ${modoLabel}`,
    `📍 *Endereço:* ${endereco}`,
    ``,
    `🛒 *Fatias Reservadas:*`,
    itensTxt,
    ``,
    `💰 *Total Geral:* ${formatBRL(s.total)}`,
    `-----------------------------------------`,
    `👉 *Lembrete:* Seus produtos estão reservados! Os envios e retiradas começam neste Domingo a partir das 14h.`,
  ].join("\n");
}


function openWhatsAppOrder(s: SuccessInfo) {
  const mensagem = buildWhatsAppMessage(s);
  window.open("https://wa.me/5575991074216?text=" + encodeURIComponent(mensagem), "_blank");
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M.057 24l1.687-6.163a11.867 11.867 0 01-1.587-5.946C.16 5.335 5.495 0 12.05 0a11.82 11.82 0 018.413 3.488 11.82 11.82 0 013.48 8.414c-.003 6.554-5.338 11.89-11.893 11.89a11.9 11.9 0 01-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 001.51 5.26l-.999 3.648 3.978-.607zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.149-.174.198-.298.298-.496.099-.198.05-.372-.025-.521-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.71.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.247-.694.247-1.289.173-1.413z"/>
    </svg>
  );
}
