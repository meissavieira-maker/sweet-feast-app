import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  Calculator,
  CircleAlert,
  Loader2,
  Pencil,
  Plus,
  ReceiptText,
  Trash2,
  TrendingUp,
  WalletCards,
} from "lucide-react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { formatBRL } from "@/lib/cart-context";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";

type CostItem = { id: string; name: string; kind: "ingrediente" | "embalagem"; base_unit: "g" | "ml" | "un"; active: boolean };
type CostItemPrice = CostItem & { unit_cost: number; purchased_total: number };
type PurchaseLine = { id?: string; item_id: string; quantity: number; unit: string; total_cost: number; cost_items?: { name: string; kind: string } | null };
type Purchase = { id: string; purchase_date: string; supplier: string; notes: string; cost_purchase_items: PurchaseLine[] };
type Expense = { id: string; expense_date: string; category: string; description: string; amount: number; notes: string };
type RecipeComponent = { id?: string; item_id: string; quantity: number; unit: string; cost_items?: { name: string; kind: string } | null };
type Recipe = { id: string; name: string; product_id: string | null; yield_quantity: number; yield_label: string; labor_cost: number; overhead_percent: number; notes: string; cost_recipe_components: RecipeComponent[] };
type RecipeSummary = { id: string; name: string; product_name: string | null; sale_price: number | null; yield_quantity: number; yield_label: string; component_cost: number; direct_cost: number; total_cost: number; unit_cost: number; unit_profit: number | null; margin_percent: number | null; unpriced_items: number };
type ProductOption = { id: string; name: string; price: number };
type Section = "panorama" | "compras" | "gastos" | "receitas";

const expenseCategories = ["Energia", "Gás", "Água", "Transporte", "Mão de obra", "Manutenção", "Marketing", "Outros"];
const chartConfig = {
  purchases: { label: "Compras", color: "var(--primary)" },
  expenses: { label: "Outros gastos", color: "var(--gold)" },
} satisfies ChartConfig;

function currentMonth() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bahia", year: "numeric", month: "2-digit" })
    .format(new Date())
    .slice(0, 7);
}

function today() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bahia", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

function monthBounds(month: string) {
  const [year, value] = month.split("-").map(Number);
  const next = value === 12 ? `${year + 1}-01-01` : `${year}-${String(value + 1).padStart(2, "0")}-01`;
  return { from: `${month}-01`, to: next };
}

function shiftMonth(month: string, delta: number) {
  const [year, value] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year, value - 1 + delta, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(month: string) {
  return new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${month}-15T12:00:00Z`));
}

function dateLabel(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(new Date(`${value}T12:00:00Z`));
}

function unitsFor(base: CostItem["base_unit"]) {
  if (base === "g") return ["g", "kg"];
  if (base === "ml") return ["ml", "l"];
  return ["un"];
}

function toBase(quantity: number, unit: string) {
  return unit === "kg" || unit === "l" ? quantity * 1000 : quantity;
}

export function AdminCosts() {
  const [section, setSection] = useState<Section>("panorama");
  const [month, setMonth] = useState(currentMonth);
  const [itemDialog, setItemDialog] = useState<CostItem | Partial<CostItem> | null>(null);
  const [purchaseDialog, setPurchaseDialog] = useState<Purchase | Partial<Purchase> | null>(null);
  const [expenseDialog, setExpenseDialog] = useState<Expense | Partial<Expense> | null>(null);
  const [recipeDialog, setRecipeDialog] = useState<Recipe | Partial<Recipe> | null>(null);
  const queryClient = useQueryClient();
  const bounds = monthBounds(month);

  const query = useQuery({
    queryKey: ["admin-costs", month],
    queryFn: async () => {
      const [itemsResult, purchasesResult, expensesResult, recipesResult, summariesResult, productsResult] = await Promise.all([
        supabase.from("cost_item_prices").select("id,name,kind,base_unit,active,unit_cost,purchased_total").order("name"),
        supabase.from("cost_purchases").select("id,purchase_date,supplier,notes,cost_purchase_items(id,item_id,quantity,unit,total_cost,cost_items(name,kind))").gte("purchase_date", bounds.from).lt("purchase_date", bounds.to).order("purchase_date", { ascending: false }),
        supabase.from("cost_expenses").select("id,expense_date,category,description,amount,notes").gte("expense_date", bounds.from).lt("expense_date", bounds.to).order("expense_date", { ascending: false }),
        supabase.from("cost_recipes").select("id,name,product_id,yield_quantity,yield_label,labor_cost,overhead_percent,notes,cost_recipe_components(id,item_id,quantity,unit,cost_items(name,kind))").order("name"),
        supabase.from("cost_recipe_summary").select("id,name,product_name,sale_price,yield_quantity,yield_label,component_cost,direct_cost,total_cost,unit_cost,unit_profit,margin_percent,unpriced_items").order("name"),
        supabase.from("products").select("id,name,price").order("name"),
      ]);
      const error = itemsResult.error ?? purchasesResult.error ?? expensesResult.error ?? recipesResult.error ?? summariesResult.error ?? productsResult.error;
      if (error) throw error;
      return {
        items: (itemsResult.data ?? []) as CostItemPrice[],
        purchases: (purchasesResult.data ?? []) as Purchase[],
        expenses: (expensesResult.data ?? []) as Expense[],
        recipes: (recipesResult.data ?? []) as Recipe[],
        summaries: (summariesResult.data ?? []) as RecipeSummary[],
        products: (productsResult.data ?? []) as ProductOption[],
      };
    },
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["admin-costs"] });
  const remove = useMutation({
    mutationFn: async ({ table, id }: { table: "cost_items" | "cost_purchases" | "cost_expenses" | "cost_recipes"; id: string }) => {
      const { error } = await supabase.from(table).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Registro removido"); void refresh(); },
    onError: (error: Error) => toast.error(error.message.includes("foreign key") ? "Este item está sendo usado em uma compra ou receita." : error.message),
  });

  const totals = useMemo(() => {
    const purchases = (query.data?.purchases ?? []).reduce((sum, purchase) => sum + purchase.cost_purchase_items.reduce((lineSum, line) => lineSum + Number(line.total_cost), 0), 0);
    const expenses = (query.data?.expenses ?? []).reduce((sum, expense) => sum + Number(expense.amount), 0);
    const days = new Map<string, { date: string; label: string; purchases: number; expenses: number }>();
    const ensure = (date: string) => {
      const row = days.get(date) ?? { date, label: date.slice(8, 10), purchases: 0, expenses: 0 };
      days.set(date, row);
      return row;
    };
    for (const purchase of query.data?.purchases ?? []) ensure(purchase.purchase_date).purchases += purchase.cost_purchase_items.reduce((sum, line) => sum + Number(line.total_cost), 0);
    for (const expense of query.data?.expenses ?? []) ensure(expense.expense_date).expenses += Number(expense.amount);
    const categories = new Map<string, number>();
    for (const expense of query.data?.expenses ?? []) categories.set(expense.category, (categories.get(expense.category) ?? 0) + Number(expense.amount));
    return { purchases, expenses, total: purchases + expenses, days: Array.from(days.values()).sort((a, b) => a.date.localeCompare(b.date)), categories: Array.from(categories, ([name, amount]) => ({ name, amount })).sort((a, b) => b.amount - a.amount) };
  }, [query.data]);

  function confirmRemove(table: "cost_items" | "cost_purchases" | "cost_expenses" | "cost_recipes", id: string, label: string) {
    if (confirm(`Excluir ${label}?`)) remove.mutate({ table, id });
  }

  return (
    <section className="space-y-5">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h2 className="font-display text-3xl text-foreground">Controle de custos</h2>
          <p className="mt-1 text-sm text-muted-foreground">Compras, despesas, fichas técnicas e margens em um só lugar.</p>
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-1">
          <Button type="button" variant="ghost" size="icon" aria-label="Mês anterior" onClick={() => setMonth((value) => shiftMonth(value, -1))}><ArrowLeft /></Button>
          <input type="month" value={month} onChange={(event) => setMonth(event.target.value)} className="h-9 min-w-36 bg-transparent px-2 text-sm font-semibold capitalize text-foreground outline-none" aria-label="Mês do relatório" />
          <Button type="button" variant="ghost" size="icon" aria-label="Próximo mês" onClick={() => setMonth((value) => shiftMonth(value, 1))}><ArrowRight /></Button>
        </div>
      </div>

      <Tabs value={section} onValueChange={(value) => setSection(value as Section)}>
        <div className="no-scrollbar overflow-x-auto">
          <TabsList className="w-max">
            <TabsTrigger value="panorama">Panorama</TabsTrigger>
            <TabsTrigger value="compras">Compras e itens</TabsTrigger>
            <TabsTrigger value="gastos">Gastos</TabsTrigger>
            <TabsTrigger value="receitas">Receitas</TabsTrigger>
          </TabsList>
        </div>

        {query.isLoading ? <div className="flex min-h-72 items-center justify-center text-muted-foreground"><Loader2 className="h-7 w-7 animate-spin" /></div> : query.error ? <div role="alert" className="mt-5 rounded-lg border border-destructive/30 bg-destructive/10 p-6 text-center text-sm text-destructive">Não foi possível carregar os custos.</div> : (
          <>
            <TabsContent value="panorama" className="mt-5 space-y-4">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <Metric title="Compras do mês" value={formatBRL(totals.purchases)} icon={ReceiptText} />
                <Metric title="Outros gastos" value={formatBRL(totals.expenses)} icon={WalletCards} />
                <Metric title="Custo lançado" value={formatBRL(totals.total)} icon={TrendingUp} />
                <Metric title="Fichas técnicas" value={String(query.data?.summaries.length ?? 0)} icon={Calculator} />
              </div>
              <div className="grid gap-4 lg:grid-cols-3">
                <Panel className="lg:col-span-2" title={`Custos em ${monthLabel(month)}`} subtitle="Compras e demais gastos por dia">
                  {totals.days.length ? <ChartContainer config={chartConfig} className="h-72 w-full aspect-auto"><BarChart data={totals.days} margin={{ left: 0, right: 8, top: 12 }}><CartesianGrid vertical={false} /><XAxis dataKey="label" tickLine={false} axisLine={false} /><YAxis tickLine={false} axisLine={false} width={52} tickFormatter={(value) => `R$${value}`} /><ChartTooltip content={<ChartTooltipContent formatter={(value) => <span className="ml-auto font-medium tabular-nums">{formatBRL(Number(value))}</span>} />} /><Bar dataKey="purchases" fill="var(--color-purchases)" radius={[3, 3, 0, 0]} /><Bar dataKey="expenses" fill="var(--color-expenses)" radius={[3, 3, 0, 0]} /></BarChart></ChartContainer> : <Empty title="Nenhum custo neste mês" text="Comece lançando uma compra ou um gasto." />}
                </Panel>
                <Panel title="Gastos por categoria" subtitle="Além dos ingredientes e embalagens">
                  {totals.categories.length ? <div className="space-y-3">{totals.categories.map((category) => <div key={category.name} className="flex items-center justify-between gap-4 border-b border-border pb-3 text-sm last:border-0"><span className="text-muted-foreground">{category.name}</span><strong className="tabular-nums text-foreground">{formatBRL(category.amount)}</strong></div>)}</div> : <Empty title="Sem outros gastos" text="Nenhum gasto geral foi lançado." />}
                </Panel>
              </div>
              <Panel title="Custos e margens das receitas" subtitle="Valores baseados no custo médio das compras registradas">
                <RecipeTable summaries={query.data?.summaries ?? []} onEdit={(summary) => setRecipeDialog(query.data?.recipes.find((recipe) => recipe.id === summary.id) ?? null)} onDelete={(summary) => confirmRemove("cost_recipes", summary.id, `a receita “${summary.name}”`)} />
              </Panel>
            </TabsContent>

            <TabsContent value="compras" className="mt-5 space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-display text-2xl text-foreground">Compras de {monthLabel(month)}</h3><p className="text-sm text-muted-foreground">Registre cada nota e os itens comprados.</p></div><Button onClick={() => setPurchaseDialog({ purchase_date: today(), supplier: "", notes: "", cost_purchase_items: [] })}><Plus /> Nova compra</Button></div>
              <div className="grid gap-3 lg:grid-cols-2">{query.data?.purchases.length ? query.data.purchases.map((purchase) => <article key={purchase.id} className="rounded-lg border border-border bg-card p-4 shadow-soft"><div className="flex items-start justify-between gap-3"><div><p className="font-semibold text-card-foreground">{purchase.supplier || "Compra sem fornecedor"}</p><p className="text-xs text-muted-foreground">{dateLabel(purchase.purchase_date)} · {purchase.cost_purchase_items.length} {purchase.cost_purchase_items.length === 1 ? "item" : "itens"}</p></div><strong className="tabular-nums text-card-foreground">{formatBRL(purchase.cost_purchase_items.reduce((sum, line) => sum + Number(line.total_cost), 0))}</strong></div><div className="mt-3 space-y-1 border-t border-border pt-3">{purchase.cost_purchase_items.map((line) => <div key={line.id} className="flex justify-between gap-3 text-xs"><span className="text-muted-foreground">{line.cost_items?.name} · {line.quantity} {line.unit}</span><span className="tabular-nums text-foreground">{formatBRL(Number(line.total_cost))}</span></div>)}</div><div className="mt-3 flex justify-end gap-1"><Button variant="ghost" size="icon" aria-label="Editar compra" onClick={() => setPurchaseDialog(purchase)}><Pencil /></Button><Button variant="ghost" size="icon" aria-label="Excluir compra" onClick={() => confirmRemove("cost_purchases", purchase.id, "esta compra")}><Trash2 /></Button></div></article>) : <div className="lg:col-span-2"><Empty title="Nenhuma compra neste mês" text="Use Nova compra para registrar ingredientes e embalagens." /></div>}</div>
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-6"><div><h3 className="font-display text-2xl text-foreground">Catálogo de itens</h3><p className="text-sm text-muted-foreground">Ingredientes e embalagens usados nas compras e receitas.</p></div><Button variant="outline" onClick={() => setItemDialog({ kind: "ingrediente", base_unit: "g", active: true })}><Plus /> Novo item</Button></div>
              <div className="overflow-x-auto rounded-lg border border-border bg-card"><table className="w-full min-w-[620px] text-left text-sm"><thead className="bg-secondary/60 text-xs uppercase text-muted-foreground"><tr><th className="p-3 font-medium">Item</th><th className="p-3 font-medium">Tipo</th><th className="p-3 font-medium">Unidade-base</th><th className="p-3 text-right font-medium">Custo médio</th><th className="p-3 text-right font-medium">Ações</th></tr></thead><tbody className="divide-y divide-border">{query.data?.items.map((item) => <tr key={item.id}><td className="p-3 font-medium text-card-foreground">{item.name}</td><td className="p-3 capitalize text-muted-foreground">{item.kind}</td><td className="p-3 text-muted-foreground">{item.base_unit}</td><td className="p-3 text-right tabular-nums">{item.unit_cost ? `${formatBRL(Number(item.unit_cost))}/${item.base_unit}` : "Sem compra"}</td><td className="p-3 text-right"><Button variant="ghost" size="icon" aria-label="Editar item" onClick={() => setItemDialog(item)}><Pencil /></Button><Button variant="ghost" size="icon" aria-label="Excluir item" onClick={() => confirmRemove("cost_items", item.id, `“${item.name}”`)}><Trash2 /></Button></td></tr>)}</tbody></table></div>
            </TabsContent>

            <TabsContent value="gastos" className="mt-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-display text-2xl text-foreground">Gastos de {monthLabel(month)}</h3><p className="text-sm text-muted-foreground">Energia, gás, mão de obra e demais custos da produção.</p></div><Button onClick={() => setExpenseDialog({ expense_date: today(), category: expenseCategories[0], amount: 0, notes: "" })}><Plus /> Novo gasto</Button></div>
              <div className="overflow-x-auto rounded-lg border border-border bg-card"><table className="w-full min-w-[700px] text-left text-sm"><thead className="bg-secondary/60 text-xs uppercase text-muted-foreground"><tr><th className="p-3 font-medium">Data</th><th className="p-3 font-medium">Descrição</th><th className="p-3 font-medium">Categoria</th><th className="p-3 text-right font-medium">Valor</th><th className="p-3 text-right font-medium">Ações</th></tr></thead><tbody className="divide-y divide-border">{query.data?.expenses.map((expense) => <tr key={expense.id}><td className="p-3 text-muted-foreground">{dateLabel(expense.expense_date)}</td><td className="p-3 font-medium text-card-foreground">{expense.description}</td><td className="p-3 text-muted-foreground">{expense.category}</td><td className="p-3 text-right font-semibold tabular-nums">{formatBRL(Number(expense.amount))}</td><td className="p-3 text-right"><Button variant="ghost" size="icon" aria-label="Editar gasto" onClick={() => setExpenseDialog(expense)}><Pencil /></Button><Button variant="ghost" size="icon" aria-label="Excluir gasto" onClick={() => confirmRemove("cost_expenses", expense.id, "este gasto")}><Trash2 /></Button></td></tr>)}</tbody></table>{!query.data?.expenses.length && <Empty title="Nenhum gasto neste mês" text="Cadastre os custos gerais da produção." />}</div>
            </TabsContent>

            <TabsContent value="receitas" className="mt-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-display text-2xl text-foreground">Fichas técnicas</h3><p className="text-sm text-muted-foreground">Descubra o custo, lucro e margem de cada produto.</p></div><Button onClick={() => setRecipeDialog({ name: "", product_id: null, yield_quantity: 1, yield_label: "unidades", labor_cost: 0, overhead_percent: 0, notes: "", cost_recipe_components: [] })}><Plus /> Nova receita</Button></div>
              <div className="rounded-lg border border-border bg-card p-4"><RecipeTable summaries={query.data?.summaries ?? []} onEdit={(summary) => setRecipeDialog(query.data?.recipes.find((recipe) => recipe.id === summary.id) ?? null)} onDelete={(summary) => confirmRemove("cost_recipes", summary.id, `a receita “${summary.name}”`)} /></div>
            </TabsContent>
          </>
        )}
      </Tabs>

      {itemDialog && <ItemDialog initial={itemDialog} onClose={() => setItemDialog(null)} onSaved={() => { setItemDialog(null); void refresh(); }} />}
      {purchaseDialog && <PurchaseDialog initial={purchaseDialog} items={query.data?.items ?? []} onClose={() => setPurchaseDialog(null)} onSaved={() => { setPurchaseDialog(null); void refresh(); }} />}
      {expenseDialog && <ExpenseDialog initial={expenseDialog} onClose={() => setExpenseDialog(null)} onSaved={() => { setExpenseDialog(null); void refresh(); }} />}
      {recipeDialog && <RecipeDialog initial={recipeDialog} items={query.data?.items ?? []} products={query.data?.products ?? []} onClose={() => setRecipeDialog(null)} onSaved={() => { setRecipeDialog(null); void refresh(); }} />}
    </section>
  );
}

function ItemDialog({ initial, onClose, onSaved }: { initial: CostItem | Partial<CostItem>; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState(initial);
  const [busy, setBusy] = useState(false);
  async function save() {
    if (!form.name?.trim() || !form.base_unit || !form.kind) return toast.error("Preencha nome, tipo e unidade.");
    setBusy(true);
    const payload = { name: form.name.trim(), kind: form.kind, base_unit: form.base_unit, active: form.active ?? true };
    const result = form.id ? await supabase.from("cost_items").update(payload).eq("id", form.id) : await supabase.from("cost_items").insert(payload);
    setBusy(false);
    if (result.error) return toast.error(result.error.message);
    toast.success("Item salvo"); onSaved();
  }
  return <Dialog open onOpenChange={(open) => !open && onClose()}><DialogContent><DialogTitle>{form.id ? "Editar item" : "Novo item"}</DialogTitle><DialogDescription>Cadastre um ingrediente ou embalagem uma única vez.</DialogDescription><div className="grid gap-4"><Field label="Nome"><input className="input" value={form.name ?? ""} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Ex.: Farinha de trigo" /></Field><div className="grid grid-cols-2 gap-3"><Field label="Tipo"><select className="input" value={form.kind ?? "ingrediente"} onChange={(event) => setForm({ ...form, kind: event.target.value as CostItem["kind"] })}><option value="ingrediente">Ingrediente</option><option value="embalagem">Embalagem</option></select></Field><Field label="Unidade-base"><select className="input" value={form.base_unit ?? "g"} onChange={(event) => setForm({ ...form, base_unit: event.target.value as CostItem["base_unit"] })}><option value="g">Grama (g)</option><option value="ml">Mililitro (ml)</option><option value="un">Unidade</option></select></Field></div></div><DialogFooter><Button variant="outline" onClick={onClose}>Cancelar</Button><Button disabled={busy} onClick={() => void save()}>{busy && <Loader2 className="animate-spin" />} Salvar</Button></DialogFooter></DialogContent></Dialog>;
}

function PurchaseDialog({ initial, items, onClose, onSaved }: { initial: Purchase | Partial<Purchase>; items: CostItemPrice[]; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ purchase_date: initial.purchase_date ?? today(), supplier: initial.supplier ?? "", notes: initial.notes ?? "" });
  const [lines, setLines] = useState<PurchaseLine[]>(initial.cost_purchase_items?.map(({ item_id, quantity, unit, total_cost }) => ({ item_id, quantity: Number(quantity), unit, total_cost: Number(total_cost) })) ?? []);
  const [busy, setBusy] = useState(false);
  function addLine() { const item = items[0]; if (!item?.id) return toast.error("Cadastre um item antes de lançar a compra."); setLines((value) => [...value, { item_id: item.id, quantity: 1, unit: item.base_unit ?? "un", total_cost: 0 }]); }
  function updateLine(index: number, patch: Partial<PurchaseLine>) { setLines((value) => value.map((line, position) => position === index ? { ...line, ...patch } : line)); }
  async function save() {
    if (!form.purchase_date || !lines.length || lines.some((line) => !line.item_id || line.quantity <= 0 || line.total_cost < 0)) return toast.error("Preencha a data e todos os itens da compra.");
    setBusy(true);
    try {
      let id = initial.id;
      if (id) {
        const { error } = await supabase.from("cost_purchases").update(form).eq("id", id); if (error) throw error;
        const { error: lineError } = await supabase.from("cost_purchase_items").delete().eq("purchase_id", id); if (lineError) throw lineError;
      } else {
        const { data, error } = await supabase.from("cost_purchases").insert(form).select("id").single(); if (error) throw error; id = data.id;
      }
      if (!id) throw new Error("Não foi possível identificar a compra.");
      const { error } = await supabase.from("cost_purchase_items").insert(lines.map((line) => ({ purchase_id: id, item_id: line.item_id, quantity: line.quantity, unit: line.unit, total_cost: line.total_cost })));
      if (error) throw error;
      toast.success("Compra salva"); onSaved();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Erro ao salvar compra"); } finally { setBusy(false); }
  }
  const total = lines.reduce((sum, line) => sum + Number(line.total_cost), 0);
  return <Dialog open onOpenChange={(open) => !open && onClose()}><DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto"><DialogTitle>{initial.id ? "Editar compra" : "Nova compra"}</DialogTitle><DialogDescription>Adicione todos os itens da mesma compra.</DialogDescription><div className="grid gap-3 sm:grid-cols-2"><Field label="Data"><input type="date" className="input" value={form.purchase_date} onChange={(event) => setForm({ ...form, purchase_date: event.target.value })} /></Field><Field label="Fornecedor"><input className="input" value={form.supplier} onChange={(event) => setForm({ ...form, supplier: event.target.value })} placeholder="Opcional" /></Field></div><div className="space-y-3"><div className="flex items-center justify-between"><h4 className="font-semibold text-foreground">Itens</h4><Button variant="outline" size="sm" onClick={addLine}><Plus /> Adicionar item</Button></div>{lines.map((line, index) => { const selected = items.find((item) => item.id === line.item_id); return <div key={`${line.item_id}-${index}`} className="grid gap-2 rounded-lg border border-border p-3 sm:grid-cols-[2fr_1fr_1fr_1fr_auto]"><Field label="Item"><select className="input" value={line.item_id} onChange={(event) => { const item = items.find((candidate) => candidate.id === event.target.value); updateLine(index, { item_id: event.target.value, unit: item?.base_unit ?? "un" }); }}>{items.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field><Field label="Quantidade"><input type="number" min="0.001" step="0.001" className="input" value={line.quantity} onChange={(event) => updateLine(index, { quantity: Number(event.target.value) })} /></Field><Field label="Unidade"><select className="input" value={line.unit} onChange={(event) => updateLine(index, { unit: event.target.value })}>{unitsFor(selected?.base_unit ?? "un").map((unit) => <option key={unit} value={unit}>{unit}</option>)}</select></Field><Field label="Valor total"><input type="number" min="0" step="0.01" className="input" value={line.total_cost} onChange={(event) => updateLine(index, { total_cost: Number(event.target.value) })} /></Field><Button className="self-end" variant="ghost" size="icon" aria-label="Remover item" onClick={() => setLines((value) => value.filter((_, position) => position !== index))}><Trash2 /></Button></div>; })}</div><Field label="Observações"><textarea className="input" rows={2} value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></Field><div className="flex justify-between border-t border-border pt-4"><span className="text-sm text-muted-foreground">Total da compra</span><strong className="text-lg tabular-nums text-foreground">{formatBRL(total)}</strong></div><DialogFooter><Button variant="outline" onClick={onClose}>Cancelar</Button><Button disabled={busy} onClick={() => void save()}>{busy && <Loader2 className="animate-spin" />} Salvar compra</Button></DialogFooter></DialogContent></Dialog>;
}

function ExpenseDialog({ initial, onClose, onSaved }: { initial: Expense | Partial<Expense>; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ expense_date: initial.expense_date ?? today(), category: initial.category ?? expenseCategories[0], description: initial.description ?? "", amount: Number(initial.amount ?? 0), notes: initial.notes ?? "" });
  const [busy, setBusy] = useState(false);
  async function save() { if (!form.description.trim() || !form.expense_date || form.amount < 0) return toast.error("Preencha descrição, data e valor."); setBusy(true); const result = initial.id ? await supabase.from("cost_expenses").update(form).eq("id", initial.id) : await supabase.from("cost_expenses").insert(form); setBusy(false); if (result.error) return toast.error(result.error.message); toast.success("Gasto salvo"); onSaved(); }
  return <Dialog open onOpenChange={(open) => !open && onClose()}><DialogContent><DialogTitle>{initial.id ? "Editar gasto" : "Novo gasto"}</DialogTitle><DialogDescription>Registre um custo geral da produção.</DialogDescription><div className="grid gap-3 sm:grid-cols-2"><Field label="Data"><input type="date" className="input" value={form.expense_date} onChange={(event) => setForm({ ...form, expense_date: event.target.value })} /></Field><Field label="Categoria"><select className="input" value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}>{expenseCategories.map((category) => <option key={category}>{category}</option>)}</select></Field></div><Field label="Descrição"><input className="input" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></Field><Field label="Valor"><input type="number" min="0" step="0.01" className="input" value={form.amount} onChange={(event) => setForm({ ...form, amount: Number(event.target.value) })} /></Field><Field label="Observações"><textarea className="input" rows={2} value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></Field><DialogFooter><Button variant="outline" onClick={onClose}>Cancelar</Button><Button disabled={busy} onClick={() => void save()}>{busy && <Loader2 className="animate-spin" />} Salvar</Button></DialogFooter></DialogContent></Dialog>;
}

function RecipeDialog({ initial, items, products, onClose, onSaved }: { initial: Recipe | Partial<Recipe>; items: CostItemPrice[]; products: ProductOption[]; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ name: initial.name ?? "", product_id: initial.product_id ?? "", yield_quantity: Number(initial.yield_quantity ?? 1), yield_label: initial.yield_label ?? "unidades", labor_cost: Number(initial.labor_cost ?? 0), overhead_percent: Number(initial.overhead_percent ?? 0), notes: initial.notes ?? "" });
  const [components, setComponents] = useState<RecipeComponent[]>(initial.cost_recipe_components?.map(({ item_id, quantity, unit }) => ({ item_id, quantity: Number(quantity), unit })) ?? []);
  const [busy, setBusy] = useState(false);
  const direct = components.reduce((sum, component) => { const item = items.find((candidate) => candidate.id === component.item_id); return sum + toBase(component.quantity, component.unit) * Number(item?.unit_cost ?? 0); }, 0) + form.labor_cost;
  const total = direct * (1 + form.overhead_percent / 100);
  const unitCost = form.yield_quantity > 0 ? total / form.yield_quantity : 0;
  function addComponent() { const available = items.find((item) => !components.some((component) => component.item_id === item.id)); if (!available?.id) return toast.error(items.length ? "Todos os itens já foram adicionados." : "Cadastre um item antes de montar a receita."); setComponents((value) => [...value, { item_id: available.id, quantity: 1, unit: available.base_unit }]); }
  function updateComponent(index: number, patch: Partial<RecipeComponent>) { setComponents((value) => value.map((component, position) => position === index ? { ...component, ...patch } : component)); }
  async function save() {
    if (!form.name.trim() || form.yield_quantity <= 0 || !components.length || components.some((component) => component.quantity <= 0)) return toast.error("Preencha a receita, o rendimento e seus componentes.");
    setBusy(true);
    try {
      const payload = { ...form, product_id: form.product_id || null };
      let id = initial.id;
      if (id) { const { error } = await supabase.from("cost_recipes").update(payload).eq("id", id); if (error) throw error; const { error: componentError } = await supabase.from("cost_recipe_components").delete().eq("recipe_id", id); if (componentError) throw componentError; }
      else { const { data, error } = await supabase.from("cost_recipes").insert(payload).select("id").single(); if (error) throw error; id = data.id; }
      if (!id) throw new Error("Não foi possível identificar a receita.");
      const { error } = await supabase.from("cost_recipe_components").insert(components.map((component) => ({ recipe_id: id, item_id: component.item_id, quantity: component.quantity, unit: component.unit })));
      if (error) throw error;
      toast.success("Ficha técnica salva"); onSaved();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Erro ao salvar receita"); } finally { setBusy(false); }
  }
  return <Dialog open onOpenChange={(open) => !open && onClose()}><DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto"><DialogTitle>{initial.id ? "Editar ficha técnica" : "Nova ficha técnica"}</DialogTitle><DialogDescription>Informe o rendimento e tudo o que entra na produção.</DialogDescription><div className="grid gap-3 sm:grid-cols-2"><Field label="Nome da receita"><input className="input" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></Field><Field label="Produto da loja"><select className="input" value={form.product_id} onChange={(event) => setForm({ ...form, product_id: event.target.value })}><option value="">Sem vínculo</option>{products.map((product) => <option key={product.id} value={product.id}>{product.name} · {formatBRL(product.price)}</option>)}</select></Field></div><div className="grid grid-cols-2 gap-3 sm:grid-cols-4"><Field label="Rendimento"><input type="number" min="0.001" step="0.001" className="input" value={form.yield_quantity} onChange={(event) => setForm({ ...form, yield_quantity: Number(event.target.value) })} /></Field><Field label="Descrição do rendimento"><input className="input" value={form.yield_label} onChange={(event) => setForm({ ...form, yield_label: event.target.value })} placeholder="unidades" /></Field><Field label="Mão de obra"><input type="number" min="0" step="0.01" className="input" value={form.labor_cost} onChange={(event) => setForm({ ...form, labor_cost: Number(event.target.value) })} /></Field><Field label="Rateio geral (%)"><input type="number" min="0" step="0.1" className="input" value={form.overhead_percent} onChange={(event) => setForm({ ...form, overhead_percent: Number(event.target.value) })} /></Field></div><div className="space-y-3"><div className="flex items-center justify-between"><h4 className="font-semibold text-foreground">Ingredientes e embalagens</h4><Button variant="outline" size="sm" onClick={addComponent}><Plus /> Adicionar</Button></div>{components.map((component, index) => { const selected = items.find((item) => item.id === component.item_id); const lineCost = toBase(component.quantity, component.unit) * Number(selected?.unit_cost ?? 0); return <div key={`${component.item_id}-${index}`} className="grid gap-2 rounded-lg border border-border p-3 sm:grid-cols-[2fr_1fr_1fr_1fr_auto]"><Field label="Item"><select className="input" value={component.item_id} onChange={(event) => { const item = items.find((candidate) => candidate.id === event.target.value); updateComponent(index, { item_id: event.target.value, unit: item?.base_unit ?? "un" }); }}>{items.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field><Field label="Quantidade"><input type="number" min="0.001" step="0.001" className="input" value={component.quantity} onChange={(event) => updateComponent(index, { quantity: Number(event.target.value) })} /></Field><Field label="Unidade"><select className="input" value={component.unit} onChange={(event) => updateComponent(index, { unit: event.target.value })}>{unitsFor(selected?.base_unit ?? "un").map((unit) => <option key={unit} value={unit}>{unit}</option>)}</select></Field><div className="self-end pb-2 text-right text-sm font-semibold tabular-nums text-foreground">{formatBRL(lineCost)}</div><Button className="self-end" variant="ghost" size="icon" aria-label="Remover componente" onClick={() => setComponents((value) => value.filter((_, position) => position !== index))}><Trash2 /></Button></div>; })}</div><div className="grid gap-3 rounded-lg bg-secondary p-4 sm:grid-cols-3"><div><p className="text-xs text-muted-foreground">Custo direto</p><strong className="tabular-nums">{formatBRL(direct)}</strong></div><div><p className="text-xs text-muted-foreground">Custo total com rateio</p><strong className="tabular-nums">{formatBRL(total)}</strong></div><div><p className="text-xs text-muted-foreground">Custo por unidade</p><strong className="tabular-nums text-primary">{formatBRL(unitCost)}</strong></div></div><Field label="Observações"><textarea className="input" rows={2} value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></Field><DialogFooter><Button variant="outline" onClick={onClose}>Cancelar</Button><Button disabled={busy} onClick={() => void save()}>{busy && <Loader2 className="animate-spin" />} Salvar ficha</Button></DialogFooter></DialogContent></Dialog>;
}

function RecipeTable({ summaries, onEdit, onDelete }: { summaries: RecipeSummary[]; onEdit: (summary: RecipeSummary) => void; onDelete: (summary: RecipeSummary) => void }) {
  if (!summaries.length) return <Empty title="Nenhuma ficha técnica" text="Cadastre uma receita para calcular seus custos e margem." />;
  return <div className="overflow-x-auto"><table className="w-full min-w-[820px] text-left text-sm"><thead className="border-b border-border text-xs uppercase text-muted-foreground"><tr><th className="pb-3 font-medium">Receita</th><th className="pb-3 font-medium">Produto</th><th className="pb-3 text-right font-medium">Custo total</th><th className="pb-3 text-right font-medium">Custo/un.</th><th className="pb-3 text-right font-medium">Preço</th><th className="pb-3 text-right font-medium">Lucro/un.</th><th className="pb-3 text-right font-medium">Margem</th><th className="pb-3 text-right font-medium">Ações</th></tr></thead><tbody className="divide-y divide-border">{summaries.map((summary) => <tr key={summary.id}><td className="py-3 pr-3"><p className="font-medium text-card-foreground">{summary.name}</p><p className="text-xs text-muted-foreground">Rende {summary.yield_quantity} {summary.yield_label}{summary.unpriced_items > 0 && <span className="ml-2 text-destructive">· {summary.unpriced_items} sem preço</span>}</p></td><td className="py-3 text-muted-foreground">{summary.product_name ?? "—"}</td><td className="py-3 text-right tabular-nums">{formatBRL(Number(summary.total_cost))}</td><td className="py-3 text-right font-semibold tabular-nums">{formatBRL(Number(summary.unit_cost))}</td><td className="py-3 text-right tabular-nums">{summary.sale_price == null ? "—" : formatBRL(Number(summary.sale_price))}</td><td className="py-3 text-right tabular-nums">{summary.unit_profit == null ? "—" : formatBRL(Number(summary.unit_profit))}</td><td className={`py-3 text-right font-semibold tabular-nums ${Number(summary.margin_percent ?? 0) < 30 ? "text-destructive" : "text-foreground"}`}>{summary.margin_percent == null ? "—" : `${Number(summary.margin_percent).toFixed(1)}%`}</td><td className="py-3 text-right"><Button variant="ghost" size="icon" aria-label="Editar receita" onClick={() => onEdit(summary)}><Pencil /></Button><Button variant="ghost" size="icon" aria-label="Excluir receita" onClick={() => onDelete(summary)}><Trash2 /></Button></td></tr>)}</tbody></table></div>;
}

function Metric({ title, value, icon: Icon }: { title: string; value: string; icon: typeof TrendingUp }) { return <article className="rounded-lg border border-border bg-card p-4 shadow-soft"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-medium uppercase text-muted-foreground">{title}</p><p className="mt-2 text-2xl font-bold tabular-nums text-card-foreground">{value}</p></div><span className="flex h-9 w-9 items-center justify-center rounded-md bg-accent text-accent-foreground"><Icon className="h-4 w-4" /></span></div></article>; }
function Panel({ title, subtitle, className = "", children }: { title: string; subtitle: string; className?: string; children: React.ReactNode }) { return <section className={`min-w-0 rounded-lg border border-border bg-card p-4 shadow-soft sm:p-5 ${className}`}><header className="mb-4"><h3 className="font-display text-xl text-card-foreground">{title}</h3><p className="text-xs text-muted-foreground">{subtitle}</p></header>{children}</section>; }
function Empty({ title, text }: { title: string; text: string }) { return <div className="px-5 py-10 text-center"><CircleAlert className="mx-auto h-7 w-7 text-muted-foreground" /><p className="mt-2 font-medium text-foreground">{title}</p><p className="text-sm text-muted-foreground">{text}</p></div>; }
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="grid gap-1 text-sm"><span className="text-xs font-medium text-muted-foreground">{label}</span>{children}</label>; }