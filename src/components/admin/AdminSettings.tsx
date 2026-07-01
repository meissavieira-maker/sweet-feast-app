import { useEffect, useRef, useState } from "react";
import { Loader2, Save, KeyRound, Store, Image as ImageIcon, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { useQueryClient } from "@tanstack/react-query";
import { HERO_DEFAULTS } from "@/hooks/use-hero-settings";

const SIGNED_TTL = 60 * 60 * 24 * 365 * 5;

export function AdminSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publicKey, setPublicKey] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [storeOpen, setStoreOpen] = useState(true);
  const [togglingStore, setTogglingStore] = useState(false);

  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [heroImage, setHeroImage] = useState("");
  const [heroSubtitle, setHeroSubtitle] = useState("");
  const [heroTitle, setHeroTitle] = useState("");
  const [heroNotice, setHeroNotice] = useState("");
  const [uploading, setUploading] = useState(false);
  const [savingHero, setSavingHero] = useState(false);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("app_settings")
        .select("key,value")
        .in("key", [
          "mp_public_key",
          "mp_access_token",
          "store_open",
          "hero_image_url",
          "hero_subtitle",
          "hero_title",
          "hero_notice",
        ]);
      if (error) {
        toast.error("Não foi possível carregar as configurações");
      } else {
        const map = Object.fromEntries((data ?? []).map((r) => [r.key, r.value]));
        setPublicKey(map.mp_public_key ?? "");
        setAccessToken(map.mp_access_token ?? "");
        setStoreOpen(map.store_open !== "false");
        setHeroImage(map.hero_image_url ?? "");
        setHeroSubtitle(map.hero_subtitle ?? HERO_DEFAULTS.hero_subtitle);
        setHeroTitle(map.hero_title ?? HERO_DEFAULTS.hero_title);
        setHeroNotice(map.hero_notice ?? HERO_DEFAULTS.hero_notice);
      }
      setLoading(false);
    })();
  }, []);

  async function handleHeroUpload(file: File) {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `hero/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("product-images")
        .upload(path, file, { cacheControl: "31536000", upsert: false });
      if (upErr) throw upErr;
      const { data: signed, error: sErr } = await supabase.storage
        .from("product-images")
        .createSignedUrl(path, SIGNED_TTL);
      if (sErr) throw sErr;
      setHeroImage(signed.signedUrl);
      toast.success("Imagem enviada — clique em Salvar para aplicar");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha no upload");
    } finally {
      setUploading(false);
    }
  }

  async function handleSaveHero() {
    setSavingHero(true);
    const { error } = await supabase.from("app_settings").upsert(
      [
        { key: "hero_image_url", value: heroImage.trim() },
        { key: "hero_subtitle", value: heroSubtitle.trim() },
        { key: "hero_title", value: heroTitle.trim() },
        { key: "hero_notice", value: heroNotice.trim() },
      ],
      { onConflict: "key" },
    );
    setSavingHero(false);
    if (error) {
      toast.error(error.message || "Falha ao salvar topo da página");
      return;
    }
    await qc.invalidateQueries({ queryKey: ["hero-settings"] });
    toast.success("Topo da página atualizado!");
  }


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
          <ImageIcon className="h-5 w-5 text-primary" />
          <div>
            <h2 className="font-display text-lg text-card-foreground">Topo da Página</h2>
            <p className="text-xs text-muted-foreground">
              Edite a imagem de fundo, títulos e a barra de aviso da home.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Imagem de Fundo do Banner
            </label>
            {heroImage && (
              <div className="mb-3 overflow-hidden rounded-xl border border-border bg-background">
                <img src={heroImage} alt="Prévia do banner" className="h-40 w-full object-cover object-right" />
              </div>
            )}
            <div className="flex flex-wrap items-center gap-2">
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleHeroUpload(f);
                  e.target.value = "";
                }}
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-sm hover:text-primary disabled:opacity-60"
              >
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {uploading ? "Enviando..." : "Enviar nova imagem"}
              </button>
              {heroImage && (
                <button
                  type="button"
                  onClick={() => setHeroImage("")}
                  className="text-xs text-muted-foreground underline hover:text-cherry"
                >
                  Restaurar imagem padrão
                </button>
              )}
            </div>
            <input
              type="text"
              value={heroImage}
              onChange={(e) => setHeroImage(e.target.value)}
              placeholder="ou cole uma URL de imagem"
              className="mt-2 w-full rounded-xl border border-border bg-background px-3 py-2 text-xs font-mono outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Subtítulo Superior
            </label>
            <input
              type="text"
              value={heroSubtitle}
              onChange={(e) => setHeroSubtitle(e.target.value)}
              placeholder="Confeitaria Artesanal"
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Título Principal
            </label>
            <input
              type="text"
              value={heroTitle}
              onChange={(e) => setHeroTitle(e.target.value)}
              placeholder="Meissa Vieira Confeitaria"
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Barra de Aviso
            </label>
            <textarea
              value={heroNotice}
              onChange={(e) => setHeroNotice(e.target.value)}
              rows={2}
              placeholder="Pedidos realizados para o dia..."
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
            />
          </div>

          <button
            onClick={handleSaveHero}
            disabled={savingHero || uploading}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-soft hover:brightness-110 disabled:opacity-60"
          >
            {savingHero ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Salvar topo da página
          </button>
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
