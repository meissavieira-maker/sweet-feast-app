import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Bike, Store as StoreIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatBRL } from "@/lib/cart-context";
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

export function AdminOrders() {
  const qc = useQueryClient();

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["admin-orders"],
    queryFn: async (): Promise<Order[]> => {
      const { data, error } = await supabase
        .from("orders")
        .select(
          "id,customer_name,customer_phone,mode,address,subtotal,delivery_fee,total,status,created_at,order_items(id,product_name,unit_price,quantity)",
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
                <div className="text-right">
                  <div className="font-display text-xl text-primary">{formatBRL(o.total)}</div>
                  <select
                    value={o.status}
                    onChange={(e) => setStatus(o.id, e.target.value as OrderStatus)}
                    className="mt-2 rounded-full border border-border bg-background px-3 py-1.5 text-xs outline-none focus:border-primary"
                  >
                    {Object.entries(STATUS_LABEL).map(([v, l]) => (
                      <option key={v} value={v}>
                        {l}
                      </option>
                    ))}
                  </select>
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
              </ul>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
