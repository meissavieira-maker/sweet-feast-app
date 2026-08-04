import { Search, Share2, X } from "lucide-react";
import { useState } from "react";
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
      if (navigator.share) await navigator.share({ title, url });
      else await navigator.clipboard.writeText(url);
    } catch {
      /* cancelado */
    }
  }

  return (
    <header>
      {/* Brand bar */}
      <div className="bg-brand text-brand-foreground">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3.5">
          {searching ? (
            <>
              <Search className="h-5 w-5 shrink-0 opacity-90" />
              <input
                autoFocus
                value={query}
                onChange={(e) => onQueryChange(e.target.value)}
                placeholder="Buscar no cardápio..."
                className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-brand-foreground/70"
              />
              <button
                aria-label="Fechar busca"
                onClick={() => {
                  onQueryChange("");
                  setSearching(false);
                }}
                className="shrink-0 rounded-full p-1.5 transition-colors hover:bg-black/10"
              >
                <X className="h-5 w-5" />
              </button>
            </>
          ) : (
            <>
              <div className="min-w-0 flex-1 text-center sm:text-left">
                <h1 className="truncate font-display text-lg font-semibold leading-tight sm:text-xl">
                  {title}
                </h1>
                <p className="truncate text-[11px] uppercase tracking-[0.2em] opacity-85">
                  Cachoeira &middot; BA
                </p>
              </div>
              <button
                aria-label="Buscar produtos"
                onClick={() => setSearching(true)}
                className="shrink-0 rounded-full p-2 transition-colors hover:bg-black/10"
              >
                <Search className="h-5 w-5" />
              </button>
              <button
                aria-label="Compartilhar loja"
                onClick={share}
                className="shrink-0 rounded-full p-2 transition-colors hover:bg-black/10"
              >
                <Share2 className="h-5 w-5" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Status strip */}
      <div className="bg-ink text-ink-foreground">
        <div className="mx-auto max-w-3xl px-4 py-2.5 text-center text-xs font-medium sm:text-sm">
          <span
            className={`mr-2 inline-block h-2 w-2 rounded-full align-middle ${
              status.open ? "bg-emerald-400" : "bg-rose-400"
            }`}
          />
          {status.message}
        </div>
      </div>
    </header>
  );
}
