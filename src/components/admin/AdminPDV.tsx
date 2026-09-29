import { useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowDownRight,
  ArrowUpRight,
  Bike,
  CalendarDays,
  Clock3,
  Loader2,
  PackageCheck,
  ReceiptText,
  ShoppingBag,
  Store,
  TrendingUp,
  WalletCards,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatBRL } from "@/lib/cart-context";
import { Button } from "@/components/ui/button";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

type PeriodPreset = "today" | "7d" | "30d" | "custom";

type SalesItem = {
  id: string;
  product_name: string;
  unit_price: number;
  quantity: number;
};

type SalesOrder = {
  id: string;
  customer_name: string;
  mode: "entrega" | "retirada";
  subtotal: number;
  delivery_fee: number;
  total: number;
  payment_status: string;
  created_at: string;
  order_items: SalesItem[];
};

type DateRange = { from: string; to: string };

type AdminPDVProps = {
  from: string;
  to: string;
  onRangeChange: (range: DateRange) => void;
};

const BAHIA_TIME_ZONE = "America/Bahia";
const DAY_MS = 86_400_000;

const salesChartConfig = {
  revenue: { label: "Faturamento", color: "var(--primary)" },
  orders: { label: "Pedidos", color: "var(--gold)" },
} satisfies ChartConfig;

const hourChartConfig = {
  orders: { label: "Pedidos", color: "var(--cherry)" },
} satisfies ChartConfig;

const modeChartConfig = {
  entrega: { label: "Entrega", color: "var(--primary)" },
  retirada: { label: "Retirada", color: "var(--gold)" },
} satisfies ChartConfig;

function bahiaDateString(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: BAHIA_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

function shiftDate(date: string, days: number) {
  const base = new Date(`${date}T12:00:00-03:00`);
  base.setUTCDate(base.getUTCDate() + days);
  return bahiaDateString(base);
}

function toBahiaStart(date: string) {
  return new Date(`${date}T00:00:00-03:00`).toISOString();
}

function toBahiaExclusiveEnd(date: string) {
  return new Date(new Date(`${date}T00:00:00-03:00`).getTime() + DAY_MS).toISOString();
}

function dateSpan(from: string, to: string) {
  return Math.max(1, Math.round((new Date(`${to}T12:00:00-03:00`).getTime() - new Date(`${from}T12:00:00-03:00`).getTime()) / DAY_MS) + 1);
}

function formatShortDate(date: string) {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", timeZone: BAHIA_TIME_ZONE }).format(
    new Date(`${date}T12:00:00-03:00`),
  );
}

function formatDateTime(date: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: BAHIA_TIME_ZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

function hourInBahia(date: string) {
  return Number(new Intl.DateTimeFormat("pt-BR", { timeZone: BAHIA_TIME_ZONE, hour: "2-digit", hourCycle: "h23" }).format(new Date(date)));
}

function localDateInBahia(date: string) {
  return bahiaDateString(new Date(date));
}

function comparisonPercent(current: number, previous: number) {
  if (previous === 0) return current === 0 ? 0 : null;
  return ((current - previous) / previous) * 100;
}

function getPreset(from: string, to: string): PeriodPreset {
  const today = bahiaDateString();
  if (from === today && to === today) return "today";
  if (to === today && from === shiftDate(today, -6)) return "7d";
  if (to === today && from === shiftDate(today, -29)) return "30d";
  return "custom";
}

async function fetchPreparingOrders(from: string, to: string): Promise<SalesOrder[]> {
  const { data, error } = await supabase
    .from("orders")
    .select("id,customer_name,mode,subtotal,delivery_fee,total,payment_status,created_at,order_items(id,product_name,unit_price,quantity)")
    .eq("status", "preparando")
    .gte("created_at", toBahiaStart(from))
    .lt("created_at", toBahiaExclusiveEnd(to))
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as SalesOrder[];
}

export function AdminPDV({ from, to, onRangeChange }: AdminPDVProps) {
  const queryClient = useQueryClient();
  const span = dateSpan(from, to);
  const previousTo = shiftDate(from, -1);
  const previousFrom = shiftDate(previousTo, -(span - 1));
  const preset = getPreset(from, to);
  const queryKey = ["admin-pdv", from, to, previousFrom, previousTo];

  const { data, isLoading, error } = useQuery({
    queryKey,
    queryFn: async () => {
      const [current, previous] = await Promise.all([
        fetchPreparingOrders(from, to),
        fetchPreparingOrders(previousFrom, previousTo),
      ]);
      return { current, previous };
    },
    refetchInterval: 30_000,
  });

  useEffect(() => {
    const channel = supabase
      .channel("admin-pdv-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => {
        void queryClient.invalidateQueries({ queryKey: ["admin-pdv"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "order_items" }, () => {
        void queryClient.invalidateQueries({ queryKey: ["admin-pdv"] });
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const report = useMemo(() => buildReport(data?.current ?? [], from, to), [data?.current, from, to]);
  const previousReport = useMemo(
    () => buildReport(data?.previous ?? [], previousFrom, previousTo),
    [data?.previous, previousFrom, previousTo],
  );

  function choosePreset(next: Exclude<PeriodPreset, "custom">) {
    const today = bahiaDateString();
    const days = next === "today" ? 1 : next === "7d" ? 7 : 30;
    onRangeChange({ from: shiftDate(today, -(days - 1)), to: today });
  }

  const revenueComparison = comparisonPercent(report.revenue, previousReport.revenue);
  const ordersComparison = comparisonPercent(report.orders, previousReport.orders);

  return (
    <section className="space-y-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase text-primary">
            <span className="h-2 w-2 rounded-full bg-primary" /> Apenas pedidos em Preparando
          </div>
          <h2 className="font-display text-3xl text-foreground">Gestão de vendas</h2>
          <p className="mt-1 text-sm text-muted-foreground">Visão financeira, produtos e movimento por horário.</p>
        </div>
        <div className="flex flex-col gap-3">
          <div className="flex w-full gap-1 overflow-x-auto rounded-lg bg-secondary p-1 sm:w-auto">
            {(["today", "7d", "30d"] as const).map((value) => (
              <Button
                key={value}
                type="button"
                size="sm"
                variant={preset === value ? "default" : "ghost"}
                onClick={() => choosePreset(value)}
                className="shrink-0"
              >
                {value === "today" ? "Hoje" : value === "7d" ? "7 dias" : "30 dias"}
              </Button>
            ))}
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <label className="grid gap-1 text-xs font-medium text-muted-foreground">
              De
              <input
                type="date"
                value={from}
                max={to}
                onChange={(event) => onRangeChange({ from: event.target.value, to })}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground"
              />
            </label>
            <label className="grid gap-1 text-xs font-medium text-muted-foreground">
              Até
              <input
                type="date"
                value={to}
                min={from}
                max={bahiaDateString()}
                onChange={(event) => onRangeChange({ from, to: event.target.value })}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground"
              />
            </label>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex min-h-72 items-center justify-center text-muted-foreground">
          <Loader2 className="h-7 w-7 animate-spin" />
        </div>
      ) : error ? (
        <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 p-6 text-center text-sm text-destructive">
          Não foi possível carregar o relatório. Tente novamente em instantes.
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard title="Faturamento" value={formatBRL(report.revenue)} icon={WalletCards} comparison={revenueComparison} />
            <MetricCard title="Pedidos" value={String(report.orders)} icon={ReceiptText} comparison={ordersComparison} />
            <MetricCard title="Ticket médio" value={formatBRL(report.averageTicket)} icon={TrendingUp} />
            <MetricCard title="Itens vendidos" value={String(report.itemsSold)} icon={PackageCheck} />
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <CompactMetric icon={Bike} label="Entregas" value={`${report.deliveryCount} · ${formatBRL(report.deliveryRevenue)}`} />
            <CompactMetric icon={Store} label="Retiradas" value={`${report.pickupCount} · ${formatBRL(report.pickupRevenue)}`} />
            <CompactMetric icon={ShoppingBag} label="Taxas de entrega" value={formatBRL(report.deliveryFees)} />
          </div>

          {report.orders === 0 ? (
            <div className="rounded-lg border border-dashed border-border bg-card px-6 py-16 text-center">
              <CalendarDays className="mx-auto h-8 w-8 text-muted-foreground" />
              <h3 className="mt-3 font-display text-xl text-card-foreground">Nenhuma venda contabilizada</h3>
              <p className="mt-1 text-sm text-muted-foreground">Não há pedidos em Preparando neste período.</p>
            </div>
          ) : (
            <>
              <div className="grid gap-4 xl:grid-cols-5">
                <ReportPanel className="xl:col-span-3" title="Vendas no período" subtitle="Faturamento e quantidade de pedidos por dia">
                  <ChartContainer config={salesChartConfig} className="h-72 w-full aspect-auto">
                    <AreaChart data={report.daily} margin={{ left: 0, right: 8, top: 16, bottom: 0 }}>
                      <defs>
                        <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--color-revenue)" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="var(--color-revenue)" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid vertical={false} />
                      <XAxis dataKey="label" tickLine={false} axisLine={false} minTickGap={24} />
                      <YAxis yAxisId="revenue" tickLine={false} axisLine={false} width={48} tickFormatter={(value) => `R$${value}`} />
                      <YAxis yAxisId="orders" orientation="right" allowDecimals={false} tickLine={false} axisLine={false} width={24} />
                      <ChartTooltip content={<ChartTooltipContent formatter={(value, name) => <span className="ml-auto font-medium tabular-nums">{name === "revenue" ? formatBRL(Number(value)) : `${value} pedidos`}</span>} />} />
                      <Area yAxisId="revenue" dataKey="revenue" type="monotone" stroke="var(--color-revenue)" fill="url(#revenueFill)" strokeWidth={2.5} />
                      <Line yAxisId="orders" dataKey="orders" type="monotone" stroke="var(--color-orders)" strokeWidth={2} dot={{ r: 3 }} />
                    </AreaChart>
                  </ChartContainer>
                </ReportPanel>

                <ReportPanel className="xl:col-span-2" title="Picos de pedidos" subtitle="Volume por hora do dia">
                  <ChartContainer config={hourChartConfig} className="h-72 w-full aspect-auto">
                    <BarChart data={report.hourly} margin={{ left: 0, right: 4, top: 16, bottom: 0 }}>
                      <CartesianGrid vertical={false} />
                      <XAxis dataKey="label" tickLine={false} axisLine={false} interval={2} />
                      <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={24} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="orders" fill="var(--color-orders)" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ChartContainer>
                  <div className="mt-2 flex items-center gap-2 border-t border-border pt-3 text-sm">
                    <Clock3 className="h-4 w-4 text-primary" />
                    <span className="text-muted-foreground">Maior movimento:</span>
                    <strong className="text-foreground">{report.peakHour}</strong>
                  </div>
                </ReportPanel>
              </div>

              <div className="grid gap-4 lg:grid-cols-3">
                <ReportPanel className="lg:col-span-2" title="Produtos mais vendidos" subtitle="Ranking por quantidade vendida">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[560px] text-left text-sm">
                      <thead className="border-b border-border text-xs uppercase text-muted-foreground">
                        <tr><th className="pb-3 font-medium">Produto</th><th className="pb-3 text-right font-medium">Qtd.</th><th className="pb-3 text-right font-medium">Faturamento</th><th className="pb-3 text-right font-medium">Participação</th></tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {report.products.slice(0, 10).map((product, index) => (
                          <tr key={product.name}>
                            <td className="py-3 pr-4"><div className="flex items-center gap-3"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-secondary text-xs font-bold text-secondary-foreground">{index + 1}</span><span className="font-medium text-foreground">{product.name}</span></div></td>
                            <td className="py-3 text-right tabular-nums">{product.quantity}</td>
                            <td className="py-3 text-right font-medium tabular-nums">{formatBRL(product.revenue)}</td>
                            <td className="py-3 pl-4 text-right"><div className="ml-auto flex w-24 items-center gap-2"><progress className="h-1.5 flex-1 accent-primary" max="100" value={product.share} aria-label={`${product.share.toFixed(0)}% do faturamento em produtos`} /><span className="w-9 text-xs tabular-nums text-muted-foreground">{product.share.toFixed(0)}%</span></div></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </ReportPanel>

                <ReportPanel title="Perfil das vendas" subtitle="Atendimento e pagamentos">
                  <ChartContainer config={modeChartConfig} className="mx-auto h-48 w-full max-w-64 aspect-auto">
                    <PieChart>
                      <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                      <Pie data={report.modeData} dataKey="value" nameKey="name" innerRadius={48} outerRadius={72} paddingAngle={3}>
                        {report.modeData.map((entry) => <Cell key={entry.name} fill={`var(--color-${entry.name})`} />)}
                      </Pie>
                      <ChartLegend content={<ChartLegendContent nameKey="name" />} />
                    </PieChart>
                  </ChartContainer>
                  <div className="mt-3 space-y-2 border-t border-border pt-4">
                    {report.paymentData.map((payment) => (
                      <div key={payment.name} className="flex items-center justify-between text-sm">
                        <span className="capitalize text-muted-foreground">Pagamento {payment.name}</span>
                        <strong className="tabular-nums text-foreground">{payment.count} · {formatBRL(payment.revenue)}</strong>
                      </div>
                    ))}
                  </div>
                </ReportPanel>
              </div>

              <ReportPanel title="Resumo detalhado" subtitle={`${report.orders} pedidos contabilizados no período`}>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[720px] text-left text-sm">
                    <thead className="border-b border-border text-xs uppercase text-muted-foreground">
                      <tr><th className="pb-3 font-medium">Pedido</th><th className="pb-3 font-medium">Cliente</th><th className="pb-3 font-medium">Data e hora</th><th className="pb-3 font-medium">Atendimento</th><th className="pb-3 text-right font-medium">Itens</th><th className="pb-3 text-right font-medium">Total</th></tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {report.orderDetails.map((order) => (
                        <tr key={order.id}>
                          <td className="py-3 font-mono text-xs text-muted-foreground">#{order.id.slice(0, 8).toUpperCase()}</td>
                          <td className="py-3 font-medium text-foreground">{order.customer_name}</td>
                          <td className="py-3 text-muted-foreground">{formatDateTime(order.created_at)}</td>
                          <td className="py-3 capitalize text-muted-foreground">{order.mode}</td>
                          <td className="py-3 text-right tabular-nums">{order.order_items.reduce((sum, item) => sum + item.quantity, 0)}</td>
                          <td className="py-3 text-right font-semibold tabular-nums text-foreground">{formatBRL(order.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </ReportPanel>
            </>
          )}
        </>
      )}
    </section>
  );
}

function buildReport(orders: SalesOrder[], from: string, to: string) {
  const revenue = orders.reduce((sum, order) => sum + Number(order.total), 0);
  const itemsSold = orders.reduce((sum, order) => sum + order.order_items.reduce((itemSum, item) => itemSum + item.quantity, 0), 0);
  const deliveryOrders = orders.filter((order) => order.mode === "entrega");
  const pickupOrders = orders.filter((order) => order.mode === "retirada");
  const dailyMap = new Map<string, { revenue: number; orders: number }>();
  for (let date = from; date <= to; date = shiftDate(date, 1)) dailyMap.set(date, { revenue: 0, orders: 0 });
  const hourly = Array.from({ length: 24 }, (_, hour) => ({ hour, label: `${String(hour).padStart(2, "0")}h`, orders: 0 }));
  const productMap = new Map<string, { quantity: number; revenue: number }>();
  const paymentMap = new Map<string, { count: number; revenue: number }>();

  for (const order of orders) {
    const day = localDateInBahia(order.created_at);
    const daily = dailyMap.get(day);
    if (daily) {
      daily.revenue += Number(order.total);
      daily.orders += 1;
    }
    const hour = hourInBahia(order.created_at);
    const hourBucket = hourly[hour];
    if (hourBucket) hourBucket.orders += 1;
    for (const item of order.order_items) {
      const product = productMap.get(item.product_name) ?? { quantity: 0, revenue: 0 };
      product.quantity += item.quantity;
      product.revenue += Number(item.unit_price) * item.quantity;
      productMap.set(item.product_name, product);
    }
    const status = order.payment_status?.trim().toLowerCase() || "não informado";
    const payment = paymentMap.get(status) ?? { count: 0, revenue: 0 };
    payment.count += 1;
    payment.revenue += Number(order.total);
    paymentMap.set(status, payment);
  }

  const peak = hourly.reduce((best, current) => current.orders > best.orders ? current : best, hourly[0] ?? { hour: 0, label: "00h", orders: 0 });
  const productRevenue = Array.from(productMap.values()).reduce((sum, product) => sum + product.revenue, 0);

  return {
    revenue,
    orders: orders.length,
    averageTicket: orders.length ? revenue / orders.length : 0,
    itemsSold,
    deliveryCount: deliveryOrders.length,
    pickupCount: pickupOrders.length,
    deliveryRevenue: deliveryOrders.reduce((sum, order) => sum + Number(order.total), 0),
    pickupRevenue: pickupOrders.reduce((sum, order) => sum + Number(order.total), 0),
    deliveryFees: orders.reduce((sum, order) => sum + Number(order.delivery_fee), 0),
    daily: Array.from(dailyMap, ([date, values]) => ({ date, label: formatShortDate(date), ...values })),
    hourly,
    peakHour: peak.orders ? `${peak.label} (${peak.orders} ${peak.orders === 1 ? "pedido" : "pedidos"})` : "Sem movimento",
    products: Array.from(productMap, ([name, values]) => ({ name, ...values, share: productRevenue ? (values.revenue / productRevenue) * 100 : 0 })).sort((a, b) => b.quantity - a.quantity || b.revenue - a.revenue),
    modeData: [
      { name: "entrega", value: deliveryOrders.length },
      { name: "retirada", value: pickupOrders.length },
    ],
    paymentData: Array.from(paymentMap, ([name, values]) => ({ name, ...values })).sort((a, b) => b.revenue - a.revenue),
    orderDetails: orders,
  };
}

function MetricCard({ title, value, icon: Icon, comparison }: { title: string; value: string; icon: typeof TrendingUp; comparison?: number | null }) {
  const positive = comparison !== undefined && comparison !== null && comparison >= 0;
  return (
    <article className="rounded-lg border border-border bg-card p-4 shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <div><p className="text-xs font-medium uppercase text-muted-foreground">{title}</p><p className="mt-2 text-2xl font-bold tabular-nums text-card-foreground">{value}</p></div>
        <span className="flex h-9 w-9 items-center justify-center rounded-md bg-accent text-accent-foreground"><Icon className="h-4 w-4" /></span>
      </div>
      {comparison !== undefined && (
        <div className={`mt-3 flex items-center gap-1 text-xs font-medium ${comparison === null ? "text-muted-foreground" : positive ? "text-emerald-700 dark:text-emerald-400" : "text-destructive"}`}>
          {comparison === null ? <TrendingUp className="h-3.5 w-3.5" /> : positive ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
          {comparison === null ? "Sem base no período anterior" : `${Math.abs(comparison).toFixed(1)}% ${positive ? "acima" : "abaixo"} do período anterior`}
        </div>
      )}
    </article>
  );
}

function CompactMetric({ icon: Icon, label, value }: { icon: typeof Bike; label: string; value: string }) {
  return <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3"><span className="flex h-9 w-9 items-center justify-center rounded-md bg-secondary text-secondary-foreground"><Icon className="h-4 w-4" /></span><div><p className="text-xs text-muted-foreground">{label}</p><p className="font-semibold tabular-nums text-card-foreground">{value}</p></div></div>;
}

function ReportPanel({ title, subtitle, className = "", children }: { title: string; subtitle: string; className?: string; children: React.ReactNode }) {
  return <section className={`min-w-0 rounded-lg border border-border bg-card p-4 shadow-soft sm:p-5 ${className}`}><header className="mb-4"><h3 className="font-display text-xl text-card-foreground">{title}</h3><p className="text-xs text-muted-foreground">{subtitle}</p></header>{children}</section>;
}

export { bahiaDateString, shiftDate };