import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Bike, Store as StoreIcon, Plus, Printer } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatBRL } from "@/lib/cart-context";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type OrderStatus = "pendente" | "preparando" | "saiu_entrega" | "concluido" | "cancelado";

type OrderItem = {
  id: string;
  product_name: string;
  unit_price: number;
  quantity: number;
};

type Order = {
  id: string;
  customer_name: string;
  customer_phone: string;
  mode: "entrega" | "retirada";
  address: string | null;
  subtotal: number;
  delivery_fee: number;
  total: number;
  status: OrderStatus;
  created_at: string;
  notes: string | null;
  order_items: OrderItem[];
};

const STATUS_LABEL: Record<OrderStatus, string> = {
  pendente: "Pendente",
  preparando: "Preparando",
  saiu_entrega: "Saiu para Entrega",
  concluido: "Concluído",
  cancelado: "Cancelado",
};

const STATUS_COLOR: Record<OrderStatus, string> = {
  pendente: "bg-cherry/15 text-cherry",
  preparando: "bg-gold/20 text-gold-foreground",
  saiu_entrega: "bg-primary/15 text-primary",
  concluido: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  cancelado: "bg-muted text-muted-foreground",
};

function extractCalda(notes: string | null): string | null {
  if (!notes) return null;
  const match = notes.match(/Calda escolhida:\s*(.+)/i);
  return match ? match[1].trim() : null;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "'": "&#39;",
      '"': "&quot;",
    };
    return entities[character] ?? character;
  });
}

function printOrder(order: Order) {
  const printWindow = window.open("", "_blank", "width=480,height=720");
  if (!printWindow) {
    toast.error("Permita a abertura de janelas para reimprimir a comanda");
    return;
  }

  const shortId = order.id.slice(0, 8).toUpperCase();
  const date = new Date(order.created_at).toLocaleString("pt-BR");
  const fulfillment = order.mode === "entrega" ? "Entrega" : "Retirada na loja";
  const items = order.order_items
    .map(
      (item) => `
        <tr>
          <td>${item.quantity}x ${escapeHtml(item.product_name)}</td>
          <td>${escapeHtml(formatBRL(item.unit_price * item.quantity))}</td>
        </tr>`,
    )
    .join("");
  const notes = order.notes?.trim()
    ? `<section><strong>Observações</strong><p>${escapeHtml(order.notes.trim()).replace(/\n/g, "<br>")}</p></section>`
    : "";

  printWindow.document.write(`<!doctype html>
    <html lang="pt-BR">
      <head>
        <meta charset="utf-8">
        <title>Comanda #${shortId}</title>
        <style>
          * { box-sizing: border-box; }
          body { width: 80mm; margin: 0 auto; padding: 8mm 5mm; color: #111; font: 13px/1.4 Arial, sans-serif; }
          h1 { margin: 0; text-align: center; font-size: 19px; }
          .subtitle { margin: 2px 0 14px; text-align: center; font-size: 11px; }
          section { padding: 9px 0; border-top: 1px dashed #555; }
          p { margin: 3px 0 0; }
          table { width: 100%; border-collapse: collapse; }
          td { padding: 5px 0; vertical-align: top; }
          td:last-child { width: 30%; text-align: right; white-space: nowrap; }
          .summary { margin-left: auto; width: 78%; }
          .summary div { display: flex; justify-content: space-between; padding: 2px 0; }
          .total { margin-top: 5px; padding-top: 5px !important; border-top: 1px solid #111; font-size: 16px; font-weight: 700; }
          .footer { border-top: 1px dashed #555; padding-top: 10px; text-align: center; font-size: 10px; }
          @page { size: 80mm auto; margin: 0; }
          @media print { body { width: 100%; } }
        </style>
      </head>
      <body>
        <h1>Meissa Vieira Confeitaria</h1>
        <p class="subtitle">COMANDA #${shortId}<br>${escapeHtml(date)}</p>
        <section>
          <strong>Cliente</strong>
          <p>${escapeHtml(order.customer_name)}${order.customer_phone ? `<br>${escapeHtml(order.customer_phone)}` : ""}</p>
        </section>
        <section>
          <strong>${fulfillment}</strong>
          ${order.address ? `<p>${escapeHtml(order.address)}</p>` : ""}
        </section>
        <section>
          <table><tbody>${items}</tbody></table>
        </section>
        ${notes}
        <section class="summary">
          <div><span>Subtotal</span><span>${escapeHtml(formatBRL(order.subtotal))}</span></div>
          <div><span>Taxa de entrega</span><span>${escapeHtml(formatBRL(order.delivery_fee))}</span></div>
          <div class="total"><span>Total</span><span>${escapeHtml(formatBRL(order.total))}</span></div>
        </section>
        <p class="footer">Status: ${escapeHtml(STATUS_LABEL[order.status])}</p>
        <script>window.addEventListener('load', () => { window.print(); });<\/script>
      </body>
    </html>`);
  printWindow.document.close();
}

export function AdminOrders() {
  const qc = useQueryClient();

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["admin-orders"],
    queryFn: async (): Promise<Order[]> => {
      const { data, error } = await supabase
        .from("orders")
        .select(
          "id,customer_name,customer_phone,mode,address,subtotal,delivery_fee,total,status,created_at,notes,order_items(id,product_name,unit_price,quantity)",
        )
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as Order[];
    },
  });

  // Realtime
  useEffect(() => {
    const channel = supabase
      .channel("orders-admin")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => {
        qc.invalidateQueries({ queryKey: ["admin-orders"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "order_items" }, () => {
        qc.invalidateQueries({ queryKey: ["admin-orders"] });
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [qc]);

  async function setStatus(id: string, status: OrderStatus) {
    const { error } = await supabase.from("orders").update({ status }).eq("id", id);
    if (error) toast.error(error.message);
    else toast.success("Status atualizado");
  }

  return (
    <div>
      <div className="mb-5">
        <h2 className="font-display text-2xl text-foreground">Pedidos</h2>
        <p className="text-sm text-muted-foreground">
          Atualizado em tempo real. {orders.length} {orders.length === 1 ? "pedido" : "pedidos"}.
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : orders.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
          Nenhum pedido recebido ainda.
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((o) => (
            <article key={o.id} className="rounded-2xl border border-border bg-card p-5 shadow-card">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-display text-lg text-card-foreground">{o.customer_name}</h3>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_COLOR[o.status]}`}
                    >
                      {STATUS_LABEL[o.status]}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {new Date(o.created_at).toLocaleString("pt-BR")}
                    {o.customer_phone && ` • ${o.customer_phone}`}
                  </p>
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                    {o.mode === "entrega" ? <Bike className="h-3.5 w-3.5" /> : <StoreIcon className="h-3.5 w-3.5" />}
                    {o.mode === "entrega" ? `Entrega: ${o.address ?? "—"}` : "Retirada na loja"}
                  </p>
                </div>
                <div className="flex flex-col items-end">
                  <div className="font-display text-xl text-primary">{formatBRL(o.total)}</div>
                  <div className="mt-2 flex flex-wrap justify-end gap-2">
                    <select
                      value={o.status}
                      onChange={(e) => setStatus(o.id, e.target.value as OrderStatus)}
                      className="h-8 rounded-md border border-border bg-background px-3 text-xs outline-none focus:border-primary"
                      aria-label={`Status do pedido de ${o.customer_name}`}
                    >
                      {Object.entries(STATUS_LABEL).map(([v, l]) => (
                        <option key={v} value={v}>
                          {l}
                        </option>
                      ))}
                    </select>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => printOrder(o)}
                      title="Abrir a comanda para impressão"
                    >
                      <Printer />
                      Reimprimir comanda
                    </Button>
                  </div>
                </div>
              </div>

              <ul className="mt-3 divide-y divide-border border-t border-border pt-2 text-sm">
                {o.order_items.map((it) => (
                  <li key={it.id} className="flex justify-between py-1.5">
                    <span className="text-card-foreground">
                      {it.quantity}× {it.product_name}
                    </span>
                    <span className="text-muted-foreground">{formatBRL(it.unit_price * it.quantity)}</span>
                  </li>
                ))}
                {extractCalda(o.notes) && (
                  <li className="flex items-center gap-1.5 py-1.5 text-xs text-muted-foreground/80">
                    <Plus className="h-3 w-3 text-muted-foreground/60" />
                    {extractCalda(o.notes)}
                  </li>
                )}
              </ul>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
