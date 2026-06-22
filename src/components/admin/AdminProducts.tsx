import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Pencil, Plus, Trash2, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { categories, type Product } from "@/lib/products";
import { formatBRL } from "@/lib/cart-context";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

type Editing = Partial<Product> & { id?: string };

const SIGNED_TTL = 60 * 60 * 24 * 365 * 5; // 5 anos

export function AdminProducts() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Editing | null>(null);

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["admin-products"],
    queryFn: async (): Promise<Product[]> => {
      const { data, error } = await supabase
        .from("products")
        .select("id,name,description,price,category,image_url,stock,badge")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Product[];
    },
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Produto removido");
      qc.invalidateQueries({ queryKey: ["admin-products"] });
      qc.invalidateQueries({ queryKey: ["storefront-products"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl text-foreground">Produtos</h2>
          <p className="text-sm text-muted-foreground">Cadastre, edite e controle o estoque.</p>
        </div>
        <button
          onClick={() => setEditing({ category: categories[0].id, stock: 10, price: 0 })}
          className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:brightness-110"
        >
          <Plus className="h-4 w-4" /> Novo produto
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : products.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
          Nenhum produto ainda. Clique em "Novo produto" para começar.
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-secondary/50 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="p-3">Produto</th>
                <th className="p-3">Categoria</th>
                <th className="p-3">Preço</th>
                <th className="p-3">Estoque</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} className="border-t border-border">
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      {p.image_url ? (
                        <img src={p.image_url} alt="" className="h-10 w-10 rounded-lg object-cover" />
                      ) : (
                        <div className="h-10 w-10 rounded-lg bg-muted" />
                      )}
                      <div>
                        <div className="font-medium text-card-foreground">{p.name}</div>
                        <div className="text-xs text-muted-foreground line-clamp-1">{p.description}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-3 capitalize text-muted-foreground">
                    {categories.find((c) => c.id === p.category)?.label ?? p.category}
                  </td>
                  <td className="p-3">{formatBRL(p.price)}</td>
                  <td className="p-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        p.stock <= 0
                          ? "bg-destructive/10 text-destructive"
                          : p.stock < 5
                            ? "bg-cherry/15 text-cherry"
                            : "bg-primary/10 text-primary"
                      }`}
                    >
                      {p.stock} un.
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    <button
                      onClick={() => setEditing(p)}
                      className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-muted-foreground hover:text-primary"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Apagar "${p.name}"?`)) del.mutate(p.id);
                      }}
                      className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <ProductDialog
          initial={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ["admin-products"] });
            qc.invalidateQueries({ queryKey: ["storefront-products"] });
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

function ProductDialog({
  initial,
  onClose,
  onSaved,
}: {
  initial: Editing;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<Editing>(initial);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);

  function set<K extends keyof Editing>(k: K, v: Editing[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function handleUpload(file: File) {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `products/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("product-images")
        .upload(path, file, { cacheControl: "31536000", upsert: false });
      if (upErr) throw upErr;
      const { data: signed, error: sErr } = await supabase.storage
        .from("product-images")
        .createSignedUrl(path, SIGNED_TTL);
      if (sErr) throw sErr;
      set("image_url", signed.signedUrl);
      toast.success("Imagem enviada");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha no upload");
    } finally {
      setUploading(false);
    }
  }

  async function handleSave() {
    if (!form.name || !form.category || form.price == null) {
      toast.error("Preencha nome, categoria e preço");
      return;
    }
    setBusy(true);
    try {
      const payload = {
        name: form.name,
        description: form.description ?? "",
        price: Number(form.price),
        category: form.category,
        image_url: form.image_url ?? "",
        stock: Math.max(0, Math.trunc(Number(form.stock ?? 0))),
        badge: form.badge || null,
      };
      if (form.id) {
        const { error } = await supabase.from("products").update(payload).eq("id", form.id);
        if (error) throw error;
        toast.success("Produto atualizado");
      } else {
        const { error } = await supabase.from("products").insert(payload);
        if (error) throw error;
        toast.success("Produto criado");
      }
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg rounded-3xl">
        <DialogTitle className="font-display text-xl">
          {form.id ? "Editar produto" : "Novo produto"}
        </DialogTitle>
        <DialogDescription>Preencha os campos abaixo.</DialogDescription>

        <div className="grid gap-3">
          <Field label="Nome">
            <input
              value={form.name ?? ""}
              onChange={(e) => set("name", e.target.value)}
              className="input"
            />
          </Field>
          <Field label="Descrição">
            <textarea
              value={form.description ?? ""}
              onChange={(e) => set("description", e.target.value)}
              rows={3}
              className="input"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Preço (R$)">
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.price ?? 0}
                onChange={(e) => set("price", Number(e.target.value))}
                className="input"
              />
            </Field>
            <Field label="Estoque">
              <input
                type="number"
                min="0"
                value={form.stock ?? 0}
                onChange={(e) => set("stock", Number(e.target.value))}
                className="input"
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Categoria">
              <select
                value={form.category ?? categories[0].id}
                onChange={(e) => set("category", e.target.value)}
                className="input"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Selo (opcional)">
              <input
                value={form.badge ?? ""}
                onChange={(e) => set("badge", e.target.value)}
                placeholder="ex.: Novidade"
                className="input"
              />
            </Field>
          </div>

          <Field label="Imagem">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                {form.image_url ? (
                  <img src={form.image_url} alt="" className="h-16 w-16 rounded-lg object-cover" />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-muted text-xs text-muted-foreground">
                    sem
                  </div>
                )}
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm hover:border-primary">
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  {uploading ? "Enviando..." : "Enviar arquivo"}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) void handleUpload(f);
                    }}
                  />
                </label>
              </div>
              <input
                type="url"
                value={form.image_url ?? ""}
                onChange={(e) => set("image_url", e.target.value)}
                placeholder="… ou cole um link de imagem (https://…)"
                className="input"
              />
            </div>
          </Field>
        </div>

        <div className="mt-2 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-full border border-border px-4 py-2 text-sm hover:bg-secondary"
          >
            Cancelar
          </button>
          <button
            disabled={busy || uploading}
            onClick={handleSave}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:brightness-110 disabled:opacity-60"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            Salvar
          </button>
        </div>

        <style>{`.input{width:100%;border-radius:.75rem;border:1px solid hsl(var(--border));background:hsl(var(--background));padding:.55rem .75rem;font-size:.875rem;outline:none}.input:focus{border-color:hsl(var(--primary))}`}</style>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}
