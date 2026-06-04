import { useEffect, useState } from "react";
import { Loader2, Save, KeyRound, Store } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";

export function AdminSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publicKey, setPublicKey] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [storeOpen, setStoreOpen] = useState(true);
  const [togglingStore, setTogglingStore] = useState(false);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("app_settings")
        .select("key,value")
        .in("key", ["mp_public_key", "mp_access_token", "store_open"]);
      if (error) {
        toast.error("Não foi possível carregar as configurações");
      } else {
        const map = Object.fromEntries((data ?? []).map((r) => [r.key, r.value]));
        setPublicKey(map.mp_public_key ?? "");
        setAccessToken(map.mp_access_token ?? "");
        setStoreOpen(map.store_open !== "false");
      }
      setLoading(false);
    })();
  }, []);

  async function handleSave() {
    setSaving(true);
    const { error } = await supabase.from("app_settings").upsert(
      [
        { key: "mp_public_key", value: publicKey.trim() },
        { key: "mp_access_token", value: accessToken.trim() },
      ],
      { onConflict: "key" },
    );
    setSaving(false);
    if (error) {
      toast.error(error.message || "Falha ao salvar");
      return;
    }
    toast.success("Configurações salvas com sucesso");
  }

  async function handleToggleStore(next: boolean) {
    setTogglingStore(true);
    const prev = storeOpen;
    setStoreOpen(next);
    const { error } = await supabase
      .from("app_settings")
      .upsert({ key: "store_open", value: next ? "true" : "false" }, { onConflict: "key" });
    setTogglingStore(false);
    if (error) {
      setStoreOpen(prev);
      toast.error(error.message || "Falha ao atualizar status da loja");
      return;
    }
    toast.success(next ? "Loja agora está ABERTA" : "Loja marcada como FECHADA");
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="mb-5 flex items-center gap-2">
          <Store className="h-5 w-5 text-primary" />
          <div>
            <h2 className="font-display text-lg text-card-foreground">Status da Loja</h2>
            <p className="text-xs text-muted-foreground">
              Controle o indicador da home e o bloqueio de pedidos.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between rounded-xl border border-border bg-background px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-card-foreground">
              {storeOpen ? "🟢 Aberta — recebendo pedidos" : "🔴 Fechada — pedidos pausados"}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Quando fechada, o botão de finalizar compra fica bloqueado.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {togglingStore && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            <Switch checked={storeOpen} onCheckedChange={handleToggleStore} disabled={togglingStore} />
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="mb-5 flex items-center gap-2">
          <KeyRound className="h-5 w-5 text-primary" />
          <div>
            <h2 className="font-display text-lg text-card-foreground">Mercado Pago</h2>
            <p className="text-xs text-muted-foreground">
              Suas credenciais ficam salvas com segurança e são usadas no checkout.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Chave Pública (Public Key)
            </label>
            <input
              type="password"
              value={publicKey}
              onChange={(e) => setPublicKey(e.target.value)}
              placeholder="APP_USR-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              autoComplete="off"
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm font-mono outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Token de Acesso (Access Token)
            </label>
            <div className="relative">
              <input
                type={showToken ? "text" : "password"}
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
                placeholder="APP_USR-0000000000000000-000000-..."
                autoComplete="off"
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 pr-20 text-sm font-mono outline-none focus:border-primary"
              />
              <button
                type="button"
                onClick={() => setShowToken((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full px-3 py-1 text-[11px] font-semibold text-muted-foreground hover:text-primary"
              >
                {showToken ? "Ocultar" : "Ver"}
              </button>
            </div>
            <p className="mt-1.5 text-[11px] text-muted-foreground">
              Encontre suas credenciais em{" "}
              <a
                href="https://www.mercadopago.com.br/developers/panel/app"
                target="_blank"
                rel="noreferrer"
                className="text-primary underline"
              >
                Mercado Pago Developers
              </a>
              .
            </p>
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-soft hover:brightness-110 disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Salvar credenciais
          </button>
        </div>
      </div>
    </div>
  );
}
