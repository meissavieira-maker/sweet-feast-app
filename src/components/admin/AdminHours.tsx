import { useEffect, useState } from "react";
import { Clock, Loader2, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  DAY_LABELS,
  DEFAULT_BUSINESS_HOURS,
  type BusinessHours,
} from "@/hooks/use-business-hours";

export function AdminHours() {
  const qc = useQueryClient();
  const [hours, setHours] = useState<BusinessHours>(DEFAULT_BUSINESS_HOURS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "business_hours")
        .maybeSingle();
      if (data?.value) {
        try {
          setHours({ ...DEFAULT_BUSINESS_HOURS, ...(JSON.parse(data.value) as BusinessHours) });
        } catch {
          /* mantém padrão */
        }
      }
      setLoading(false);
    })();
  }, []);

  function toggleDay(d: number) {
    setHours((h) => ({
      ...h,
      days: h.days.includes(d) ? h.days.filter((x) => x !== d) : [...h.days, d].sort(),
    }));
  }

  async function save() {
    setSaving(true);
    const { error } = await supabase
      .from("app_settings")
      .upsert({ key: "business_hours", value: JSON.stringify(hours) }, { onConflict: "key" });
    setSaving(false);
    if (error) return toast.error(error.message || "Falha ao salvar horários");
    await qc.invalidateQueries({ queryKey: ["business-hours"] });
    toast.success("Horários atualizados!");
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="mb-5 flex items-center gap-2">
        <Clock className="h-5 w-5 text-primary" />
        <div>
          <h2 className="font-display text-lg text-card-foreground">Dias e Horários</h2>
          <p className="text-xs text-muted-foreground">
            A mensagem de status no topo do site é calculada com base nesta configuração.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-6 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Dias de funcionamento
            </p>
            <div className="flex flex-wrap gap-2">
              {DAY_LABELS.map((label, d) => {
                const on = hours.days.includes(d);
                return (
                  <button
                    key={d}
                    onClick={() => toggleDay(d)}
                    className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                      on
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background text-muted-foreground hover:border-primary"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Abre às
              </span>
              <input
                type="time"
                value={hours.open}
                onChange={(e) => setHours((h) => ({ ...h, open: e.target.value }))}
                className="input"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Fecha às
              </span>
              <input
                type="time"
                value={hours.close}
                onChange={(e) => setHours((h) => ({ ...h, close: e.target.value }))}
                className="input"
              />
            </label>
          </div>

          <button
            onClick={save}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Salvar horários
          </button>
        </div>
      )}
    </div>
  );
}
