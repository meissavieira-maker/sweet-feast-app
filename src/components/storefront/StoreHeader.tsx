import { useStoreStatus } from "@/hooks/use-store-status";
import { useHeroSettings } from "@/hooks/use-hero-settings";

export function StoreHeader() {
  const { isOpen } = useStoreStatus();
  const { data: hero } = useHeroSettings();

  const imageUrl = hero?.hero_image_url;
  const subtitle = hero?.hero_subtitle ?? "";
  const title = hero?.hero_title ?? "";

  return (
    <header className="relative overflow-hidden bg-green-700">
      {/* Background image */}
      <div className="absolute inset-0">
        {imageUrl && (
          <img
            src={imageUrl}
            alt={title}
            className="h-full w-full object-cover object-center"
            width={1600}
            height={1200}
          />
        )}
        {/* Left-side dark wine gradient to smooth blurred edge & host text */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(90deg, rgba(16,4,6,0.85) 0%, rgba(26,6,10,0.65) 30%, rgba(40,10,16,0.35) 55%, rgba(0,0,0,0.15) 80%, rgba(0,0,0,0) 100%)",
          }}
        />
        {/* Soft bottom fade into page bg */}
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-background" />
      </div>


      {/* Content */}
      <div className="relative mx-auto max-w-6xl px-5 pt-8 pb-16 sm:pt-12 sm:pb-24">
        <div className="flex items-center justify-between text-primary-foreground">
          <div className="flex items-center gap-2">
            <span className="font-display text-xl italic">m.</span>
            <span className="text-xs tracking-[0.25em] uppercase opacity-80">Feito com Amor</span>
          </div>
          <span
            className={`inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/40 px-3 py-1.5 text-xs font-medium backdrop-blur-md ${
              isOpen ? "text-emerald-300" : "text-rose-300"
            }`}
          >
            <span className={`h-2 w-2 rounded-full ${isOpen ? "bg-emerald-400" : "bg-rose-400"} animate-pulse`} />
            {isOpen ? "🟢 Aberto agora" : "🔴 Fechado"}
          </span>
        </div>

        <div className="mt-16 sm:mt-24 max-w-xl text-white text-center sm:text-left">
          <p className="text-[11px] tracking-[0.35em] uppercase text-gold mb-3 drop-shadow-[0_2px_8px_rgba(0,0,0,0.7)]">
            {subtitle}
          </p>
          <h1
            className="font-display text-4xl sm:text-6xl lg:text-7xl leading-[1.02] font-medium text-white"
            style={{ textShadow: "0 4px 20px rgba(0,0,0,0.7), 0 2px 6px rgba(0,0,0,0.6)" }}
          >
            {title}
          </h1>
        </div>
      </div>
    </header>
  );
}
