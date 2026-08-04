import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, Loader2, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCategories, type CategoryRow } from "@/hooks/use-categories";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

export function AdminCategories() {
  const qc = useQueryClient();
  const { data: categories = [], isLoading } = useCategories(true);
  const [newLabel, setNewLabel] = useState("");

  const invalidate = async () => {
    await qc.invalidateQueries({ queryKey: ["categories"] });
    await qc.invalidateQueries({ queryKey: ["storefront-products"] });
  };

  const create = useMutation({
    mutationFn: async (label: string) => {
      const slug = slugify(label);
      if (!slug) throw new Error("Informe um nome válido");
      const max = categories.reduce((m, c) => Math.max(m, c.sort_order), 0);
      const { error } = await supabase
        .from("categories")
        .insert({ label: label.trim(), slug, sort_order: max + 1 });
      if (error) throw error;
    },
    onSuccess: async () => {
      setNewLabel("");
      toast.success("Categoria criada");
      await invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<CategoryRow> }) => {
      const { error } = await supabase.from("categories").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("categories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: async () => {
      toast.success("Categoria removida");
      await invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  async function move(index: number, dir: -1 | 1) {
    const a = categories[index];
    const b = categories[index + dir];
    if (!a || !b) return;
    await Promise.all([
      update.mutateAsync({ id: a.id, patch: { sort_order: b.sort_order } }),
      update.mutateAsync({ id: b.id, patch: { sort_order: a.sort_order } }),
    ]);
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-5">
        <h2 className="font-display text-2xl text-foreground">Categorias</h2>
        <p className="text-sm text-muted-foreground">
          Crie, renomeie, reordene e ative/desative as abas do cardápio.
        </p>
      </div>

      <div className="mb-5 flex gap-2">
        <input
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          placeholder="Nova categoria (ex.: Pudins)"
          className="input flex-1"
        />
        <button
          onClick={() => create.mutate(newLabel)}
          disabled={create.isPending || !newLabel.trim()}
          className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
        >
          {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Adicionar
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : (
        <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
          {categories.map((c, i) => (
            <div key={c.id} className="flex items-center gap-3 p-3">
              <div className="flex flex-col">
                <button
                  onClick={() => void move(i, -1)}
                  disabled={i === 0}
                  className="text-muted-foreground hover:text-primary disabled:opacity-30"
                  aria-label="Mover para cima"
                >
                  <ArrowUp className="h-4 w-4" />
                </button>
                <button
                  onClick={() => void move(i, 1)}
                  disabled={i === categories.length - 1}
                  className="text-muted-foreground hover:text-primary disabled:opacity-30"
                  aria-label="Mover para baixo"
                >
                  <ArrowDown className="h-4 w-4" />
                </button>
              </div>
              <input
                defaultValue={c.label}
                onBlur={(e) => {
                  const label = e.target.value.trim();
                  if (label && label !== c.label) update.mutate({ id: c.id, patch: { label } });
                }}
                className="input flex-1"
              />
              <span className="hidden text-xs text-muted-foreground sm:inline">{c.slug}</span>
              <Switch
                checked={c.active}
                onCheckedChange={(v) => update.mutate({ id: c.id, patch: { active: v } })}
              />
              <button
                onClick={() => {
                  if (confirm(`Remover a categoria "${c.label}"?`)) del.mutate(c.id);
                }}
                className="text-muted-foreground hover:text-destructive"
                aria-label="Remover"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
          {categories.length === 0 && (
            <p className="p-8 text-center text-sm text-muted-foreground">Nenhuma categoria ainda.</p>
          )}
        </div>
      )}
    </div>
  );
}
