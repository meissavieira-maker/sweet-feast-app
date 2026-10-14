import { Search, Share2, X, MapPin, Sparkles } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useStoreStatus } from "@/hooks/use-store-status";
import { useHeroSettings } from "@/hooks/use-hero-settings";
import { useBusinessHours, storeStatus, DEFAULT_BUSINESS_HOURS } from "@/hooks/use-business-hours";

export function StoreHeader({
  query,
  onQueryChange,
}: {
  query: string;
  onQueryChange: (v: string) => void;
}) {
  const { isOpen } = useStoreStatus();
  const { data: hero } = useHeroSettings();
  const { data: hours } = useBusinessHours();
  const [searching, setSearching] = useState(false);

  const title = hero?.hero_title ?? "Meissa Vieira Confeitaria";
  const status = storeStatus(hours ?? DEFAULT_BUSINESS_HOURS, isOpen);

  async function share() {
    const url = typeof window !== "undefined" ? window.location.href : "";
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({ title, text: `Confira o cardápio da ${title}!`, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      toast.success("Link copiado!");
    } catch {
      try {
        await navigator.clipboard.writeText(url);
        toast.success("Link copiado!");
      } catch {
        toast.error("Não foi possível compartilhar o link");
      }
    }
  }

  return (
    <header className="overflow-hidden bg-brand text-brand-foreground">
      <div className="bg-brand-deep/95 text-brand-deep-foreground">
        <div className="mx-auto flex max-w-3xl items-center justify-center gap-2 px-4 py-2">
          <MapPin className="h-3.5 w-3.5 shrink-0 text-gold" />
          <p className="min-w-0 text-center text-[11px] font-medium tracking-wide sm:text-xs">
            Entregamos em Cachoeira, São Félix, Muritiba e Capoeiruçu
          </p>
        </div>
      </div>

      <div className="relative">
        <div className="pointer-events-none absolute -right-10 -top-16 h-44 w-44 rounded-full border border-white/10" />
        <div className="pointer-events-none absolute -right-2 -top-8 h-28 w-28 rounded-full border border-white/10" />
        <div className="relative mx-auto flex max-w-3xl items-center gap-3 px-4 py-5 sm:py-6">
          {searching ? (
            <>
              <Search className="h-5 w-5 shrink-0 opacity-90" />
              <input
                autoFocus
                value={query}
                onChange={(e) => onQueryChange(e.target.value)}
                placeholder="Buscar no cardápio..."
                aria-label="Buscar no cardápio"
                className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-brand-foreground/65"
              />
              <button
                type="button"
                aria-label="Fechar busca"
                onClick={() => {
                  onQueryChange("");
                  setSearching(false);
                }}
                className="shrink-0 rounded-full p-2 transition-colors hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold"
              >
                <X className="h-5 w-5" />
              </button>
            </>
          ) : (
            <>
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-white/10 text-gold shadow-soft sm:h-14 sm:w-14">
                <Sparkles className="h-6 w-6 sm:h-7 sm:w-7" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-gold sm:text-[11px]">
                  Feito com carinho
                </p>
                <h1 className="truncate font-display text-xl font-semibold leading-tight sm:text-2xl">
                  {title}
                </h1>
                <p className="mt-1 text-xs text-brand-foreground/75 sm:text-sm">
                  Confeitaria artesanal · Cachoeira, BA
                </p>
              </div>
              <button
                type="button"
                aria-label="Buscar produtos"
                onClick={() => setSearching(true)}
                className="shrink-0 rounded-full p-2.5 transition-colors hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold"
              >
                <Search className="h-5 w-5" />
              </button>
              <button
                type="button"
                aria-label="Compartilhar loja"
                onClick={share}
                className="shrink-0 rounded-full p-2.5 transition-colors hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold"
              >
                <Share2 className="h-5 w-5" />
              </button>
            </>
          )}
        </div>
      </div>

      <div className="border-t border-white/10 bg-ink/95 text-ink-foreground">
        <div className="mx-auto flex max-w-3xl items-center justify-center gap-2 px-4 py-3 text-center text-xs font-medium leading-relaxed sm:text-sm">
          <span className={`relative flex h-2.5 w-2.5 shrink-0 ${status.open ? "text-emerald-400" : "text-rose-400"}`}>
            <span className={`absolute inline-flex h-full w-full rounded-full opacity-35 ${status.open ? "bg-emerald-400" : "bg-rose-400"}`} />
            <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${status.open ? "bg-emerald-400" : "bg-rose-400"}`} />
          </span>
          <span>{status.message}</span>
        </div>
      </div>
    </header>
  );
}
