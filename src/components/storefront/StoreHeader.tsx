import heroImg from "@/assets/hero-doceria.jpg";

export function StoreHeader() {
  const isOpen = true;
  return (
    <header className="relative overflow-hidden">
      <div className="absolute inset-0">
        <img src={heroImg} alt="" className="h-full w-full object-cover" width={1600} height={900} />
        <div className="absolute inset-0 bg-gradient-hero" />
      </div>

      <div className="relative mx-auto max-w-6xl px-5 pt-8 pb-12 sm:pt-12 sm:pb-20">
        <div className="flex items-center justify-between text-primary-foreground">
          <div className="flex items-center gap-2">
            <span className="font-display text-xl italic">m.</span>
            <span className="text-xs tracking-[0.25em] uppercase opacity-80">Feito com Amor</span>
          </div>
          <span
            className={`inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/30 px-3 py-1.5 text-xs font-medium backdrop-blur-md ${
              isOpen ? "text-emerald-300" : "text-rose-300"
            }`}
          >
            <span className={`h-2 w-2 rounded-full ${isOpen ? "bg-emerald-400" : "bg-rose-400"} animate-pulse`} />
            {isOpen ? "Aberto agora" : "Fechado"}
          </span>
        </div>

        <div className="mt-14 sm:mt-24 max-w-2xl text-primary-foreground">
          <p className="text-[11px] tracking-[0.35em] uppercase text-gold mb-3">Confeitaria Artesanal</p>
          <h1 className="font-display text-5xl sm:text-7xl leading-[1.02] font-medium">
            Meissa <em className="text-gold not-italic font-normal italic">Vieira</em> Confeitaria
          </h1>
          <p className="mt-5 max-w-md text-sm sm:text-base text-white/80 leading-relaxed">
            Tortas, bolos e docinhos feitos à mão todas as manhãs. Entrega na sua porta em até 60 minutos.
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-3 text-xs sm:text-sm text-white/85">
            <span className="rounded-full bg-white/10 backdrop-blur px-3 py-1.5 border border-white/15">
              Seg–Sáb · 09h às 21h
            </span>
            <span className="rounded-full bg-white/10 backdrop-blur px-3 py-1.5 border border-white/15">
              Entrega 30–60 min
            </span>
            <span className="rounded-full bg-cherry/90 px-3 py-1.5 text-cherry-foreground font-medium">
              Frete grátis acima de R$ 80
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
