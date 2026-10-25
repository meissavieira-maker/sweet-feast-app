import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Pencil, Plus, Trash2, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { type Product } from "@/lib/products";
import { useCategories } from "@/hooks/use-categories";
import { formatBRL } from "@/lib/cart-context";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

type Editing = Partial<Product> & { id?: string };

const SIGNED_TTL = 60 * 60 * 24 * 365 * 5; // 5 anos
// Limite alto apenas para proteger a memória do aparelho: a foto é sempre
// reduzida antes do envio, então fotos grandes de celular são aceitas.
const MAX_IMAGE_BYTES = 60 * 1024 * 1024;
const MAX_IMAGE_DIMENSION = 1600;

function isHeicFile(file: File): boolean {
  return (
    /hei[cf]/i.test(file.type) || /\.hei[cf]$/i.test(file.name)
  );
}

async function decodeImageFile(file: File): Promise<ImageBitmap | HTMLImageElement> {
  // createImageBitmap is not available for every image format or browser (notably iOS).
  // The image element can decode formats the device supports, including HEIC on Safari.
  try {
    if (typeof createImageBitmap !== "function") throw new Error("Use o leitor de imagens do aparelho");
    return await createImageBitmap(file);
  } catch (firstError) {
    const objectUrl = URL.createObjectURL(file);
    try {
      const img = new Image();
      img.src = objectUrl;
      await img.decode();
      return img;
    } catch {
      // HEIC/HEIF (fotos de iPhone) não abrem em alguns navegadores: converte para JPEG.
      if (isHeicFile(file)) {
        try {
          const { default: heic2any } = await import("heic2any");
          const converted = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.9 });
          const blob = Array.isArray(converted) ? converted[0] : converted;
          return await decodeImageFile(new File([blob], "foto.jpg", { type: "image/jpeg" }));
        } catch {
          throw new Error("Não foi possível abrir essa foto do iPhone. Tente novamente ou use uma imagem JPG ou PNG.");
        }
      }
      throw new Error("Não foi possível abrir essa foto. Tente uma imagem JPG, PNG ou WebP.");
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  }
}

async function prepareProductImage(file: File): Promise<File> {
  const looksLikeImage = file.type.startsWith("image/") || isHeicFile(file);
  if (!looksLikeImage) {
    throw new Error("Selecione uma foto do seu aparelho.");
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error("A imagem é grande demais. Tente uma foto de até 60 MB.");
  }

  let source: ImageBitmap | HTMLImageElement | undefined;
  try {
    source = await decodeImageFile(file);
    if (!source) throw new Error("Não foi possível abrir essa foto.");
    const isBitmap = typeof ImageBitmap !== "undefined" && source instanceof ImageBitmap;
    const sourceWidth = isBitmap ? source.width : (source as HTMLImageElement).naturalWidth;
    const sourceHeight = isBitmap ? source.height : (source as HTMLImageElement).naturalHeight;
    if (!sourceWidth || !sourceHeight) throw new Error("A foto selecionada está vazia ou danificada.");
    const scale = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(sourceWidth, sourceHeight));
    const width = Math.max(1, Math.round(sourceWidth * scale));
    const height = Math.max(1, Math.round(sourceHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Não foi possível preparar esta imagem.");
    context.drawImage(source, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.86),
    );
    if (!blob) throw new Error("Não foi possível preparar esta imagem.");
    const baseName = file.name.replace(/\.[^.]+$/, "") || "produto";
    return new File([blob], `${baseName}.jpg`, { type: "image/jpeg" });
  } finally {
    if (typeof ImageBitmap !== "undefined" && source instanceof ImageBitmap) source.close();
    if (objectUrl) URL.revokeObjectURL(objectUrl);
  }
}

export function AdminProducts() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Editing | null>(null);
  const { data: categories = [] } = useCategories(true);

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["admin-products"],
    queryFn: async (): Promise<Product[]> => {
      const { data, error } = await supabase
        .from("products")
        .select("id,name,description,price,category,image_url,stock,badge,featured,active")
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

  const visibility = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from("products").update({ active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      toast.success(variables.active ? "Produto exibido na loja" : "Produto ocultado da loja");
      void qc.invalidateQueries({ queryKey: ["admin-products"] });
      void qc.invalidateQueries({ queryKey: ["storefront-products"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <div>
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-2xl text-foreground">Produtos</h2>
          <p className="text-sm text-muted-foreground">Cadastre, edite e escolha o que aparece na loja.</p>
        </div>
        <button
          onClick={() => setEditing({ category: categories[0]?.slug ?? "", stock: 10, price: 0 })}
          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:brightness-110 sm:w-auto"
        >
          <Plus className="h-4 w-4" /> Novo produto
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : products.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border bg-card/70 p-10 text-center text-sm text-muted-foreground sm:p-12">
          Nenhum produto ainda. Clique em "Novo produto" para começar.
        </div>
      ) : (
        <>
          {/* Mobile layout: cards prevent the product columns and actions from being clipped. */}
          <div className="grid gap-3 md:hidden">
            {products.map((p) => (
              <article key={p.id} className="min-w-0 rounded-2xl border border-border bg-card p-3 shadow-sm">
                <div className="flex min-w-0 items-start gap-3">
                  {p.image_url ? (
                    <img src={p.image_url} alt="" className="h-14 w-14 shrink-0 rounded-xl object-cover" />
                  ) : (
                    <div className="h-14 w-14 shrink-0 rounded-xl bg-muted" />
                  )}
                  <div className="min-w-0 flex-1">
                    <h3 className="break-words font-semibold leading-snug text-card-foreground">{p.name}</h3>
                    {p.description && <p className="mt-1 line-clamp-2 break-words text-xs text-muted-foreground">{p.description}</p>}
                    <p className="mt-1 text-xs capitalize text-muted-foreground">
                      {categories.find((c) => c.slug === p.category)?.label ?? p.category}
                    </p>
                    <p className="mt-2 font-semibold text-foreground">{formatBRL(p.price)}</p>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-3 border-t border-border pt-3">
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Estoque</p>
                    <span className={`mt-1 inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                      p.stock <= 0
                        ? "bg-destructive/10 text-destructive"
                        : p.stock < 5
                          ? "bg-cherry/15 text-cherry"
                          : "bg-primary/10 text-primary"
                    }`}>
                      {p.stock} un.
                    </span>
                  </div>
                  <div className="flex min-w-0 items-center justify-between gap-2">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Na loja</p>
                      <p className="mt-1 text-xs text-muted-foreground">{p.active !== false ? "Visível" : "Oculto"}</p>
                    </div>
                    <Switch
                      checked={p.active !== false}
                      disabled={visibility.isPending && visibility.variables?.id === p.id}
                      onCheckedChange={(active) => visibility.mutate({ id: p.id, active })}
                      aria-label={`${p.active !== false ? "Ocultar" : "Exibir"} ${p.name} na loja`}
                      title={p.active !== false ? "Ocultar da loja" : "Exibir na loja"}
                    />
                  </div>
                </div>

                <div className="mt-3 flex gap-2 border-t border-border pt-3">
                  <button
                    type="button"
                    onClick={() => setEditing(p)}
                    className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-full border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-secondary"
                    aria-label={`Editar ${p.name}`}
                  >
                    <Pencil className="h-4 w-4" /> Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(`Apagar "${p.name}"?`)) del.mutate(p.id);
                    }}
                    className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-full border border-destructive/30 px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/10"
                    aria-label={`Excluir ${p.name}`}
                  >
                    <Trash2 className="h-4 w-4" /> Excluir
                  </button>
                </div>
              </article>
            ))}
          </div>

          {/* Desktop/tablet layout keeps the existing table. */}
          <div className="hidden overflow-x-auto rounded-2xl border border-border bg-card md:block">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="bg-secondary/50 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="p-3">Produto</th>
                  <th className="p-3">Categoria</th>
                  <th className="p-3">Preço</th>
                  <th className="p-3">Estoque</th>
                  <th className="p-3 text-center">Na loja</th>
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
                        <div className="min-w-0">
                          <div className="font-medium text-card-foreground">{p.name}</div>
                          <div className="line-clamp-1 text-xs text-muted-foreground">{p.description}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-3 capitalize text-muted-foreground">
                      {categories.find((c) => c.slug === p.category)?.label ?? p.category}
                    </td>
                    <td className="p-3 whitespace-nowrap">{formatBRL(p.price)}</td>
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
                    <td className="p-3 text-center">
                      <Switch
                        checked={p.active !== false}
                        disabled={visibility.isPending && visibility.variables?.id === p.id}
                        onCheckedChange={(active) => visibility.mutate({ id: p.id, active })}
                        aria-label={`${p.active !== false ? "Ocultar" : "Exibir"} ${p.name} na loja`}
                        title={p.active !== false ? "Ocultar da loja" : "Exibir na loja"}
                      />
                    </td>
                    <td className="p-3 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => setEditing(p)}
                        className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-muted-foreground hover:text-primary"
                        aria-label={`Editar ${p.name}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`Apagar "${p.name}"?`)) del.mutate(p.id);
                        }}
                        className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-muted-foreground hover:text-destructive"
                        aria-label={`Excluir ${p.name}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {editing && (
        <ProductDialog
          categories={categories}
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
  categories,
  onClose,
  onSaved,
}: {
  initial: Editing;
  categories: { id: string; slug: string; label: string }[];
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
      const preparedFile = await prepareProductImage(file);
      const path = `products/${crypto.randomUUID()}.jpg`;
      const { error: upErr } = await supabase.storage
        .from("product-images")
        .upload(path, preparedFile, {
          cacheControl: "31536000",
          contentType: "image/jpeg",
          upsert: false,
        });
      if (upErr) throw upErr;
      const { data: signed, error: sErr } = await supabase.storage
        .from("product-images")
        .createSignedUrl(path, SIGNED_TTL);
      if (sErr) throw sErr;
      set("image_url", signed.signedUrl);
      toast.success("Imagem enviada");
    } catch (e) {
      const message = e instanceof Error ? e.message : "Falha no upload";
      toast.error(
        message.toLowerCase().includes("row-level security")
          ? "Sua sessão expirou. Entre novamente no painel e tente outra vez."
          : message,
      );
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
        featured: !!form.featured,
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
                value={form.category ?? categories[0]?.slug ?? ""}
                onChange={(e) => set("category", e.target.value)}
                className="input"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.slug}>
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

          <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-border bg-background px-4 py-3 text-sm">
            <input
              type="checkbox"
              checked={!!form.featured}
              onChange={(e) => set("featured", e.target.checked)}
              className="h-4 w-4 accent-primary"
            />
            Exibir em "Os Mais Pedidos" (máx. 4 produtos no site)
          </label>

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
                      e.currentTarget.value = "";
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
