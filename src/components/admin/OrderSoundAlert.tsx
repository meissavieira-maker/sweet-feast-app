import { useEffect, useRef, useState } from "react";
import { Bell, BellOff, Volume2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

const ALERT_DURATION = 7;

function playOrderChime(context: AudioContext) {
  const start = context.currentTime + 0.02;
  // An original, urgent three-burst ring inspired by classic telephone bells.
  const compressor = context.createDynamicsCompressor();
  compressor.threshold.value = -20;
  compressor.knee.value = 4;
  compressor.ratio.value = 7;
  compressor.attack.value = 0.002;
  compressor.release.value = 0.14;
  compressor.connect(context.destination);
  const rings = [0, 2.15, 4.3];
  const frequencies = [760, 980];
  let remaining = rings.length * frequencies.length;

  for (const ringOffset of rings) {
    for (const frequency of frequencies) {
      const at = start + ringOffset;
      const end = at + 1.45;
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = frequency === frequencies[0] ? "square" : "sawtooth";
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, at);
      for (let pulse = 0; pulse < 16; pulse++) {
        const pulseStart = at + pulse * 0.09;
        gain.gain.setValueAtTime(0.0001, pulseStart);
        gain.gain.exponentialRampToValueAtTime(0.34, pulseStart + 0.012);
        gain.gain.setValueAtTime(0.34, pulseStart + 0.055);
        gain.gain.exponentialRampToValueAtTime(0.0001, Math.min(pulseStart + 0.085, end));
      }
      oscillator.connect(gain);
      gain.connect(compressor);
      oscillator.start(at);
      oscillator.stop(end);
      oscillator.onended = () => {
        oscillator.disconnect();
        gain.disconnect();
        remaining -= 1;
        if (remaining === 0) compressor.disconnect();
      };
    }
  }
}

export function OrderSoundAlert() {
  const [enabled, setEnabled] = useState(false);
  const [testing, setTesting] = useState(false);
  const audioRef = useRef<AudioContext | null>(null);
  const playingUntilRef = useRef(0);
  const testTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function playAlert(context: AudioContext) {
    if (context.currentTime < playingUntilRef.current) return;
    playOrderChime(context);
    playingUntilRef.current = context.currentTime + ALERT_DURATION;
  }

  useEffect(() => {
    return () => {
      if (testTimerRef.current) clearTimeout(testTimerRef.current);
      void audioRef.current?.close();
      audioRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    let checking = false;
    let initialized = false;
    const seen = new Set<string>();
    let channel: ReturnType<typeof supabase.channel> | undefined;

    function announce(id: string) {
      if (seen.has(id) || cancelled) return;
      seen.add(id);
      const context = audioRef.current;
      if (context?.state === "running") playAlert(context);
      toast.info("Novo pedido recebido!", { duration: 7000 });
    }

    async function checkOrders() {
      if (checking) return;
      checking = true;
      const { data, error } = await supabase
        .from("orders")
        .select("id")
        .order("created_at", { ascending: false })
        .limit(100);
      checking = false;
      if (cancelled) return;
      if (error) return;
      if (!initialized) {
        initialized = true;
        for (const order of data ?? []) seen.add(order.id);
      } else {
        // Oldest first so simultaneous orders are announced in arrival order.
        for (const order of [...(data ?? [])].reverse()) announce(order.id);
      }
    }

    async function start() {
      await checkOrders(); // Existing orders must never ring when the alert is switched on.
      if (cancelled) return;
      channel = supabase
        .channel("new-orders-sound")
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "orders" }, (payload) => {
          const id = payload.new.id;
          if (typeof id === "string") announce(id);
        })
        .subscribe();
      // Poll as a fallback if a realtime event is missed or the tab was asleep.
      void checkOrders();
    }

    void start();
    const timer = window.setInterval(() => void checkOrders(), 15000);
    const onVisible = () => {
      if (document.visibilityState === "visible") void checkOrders();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      if (channel) void supabase.removeChannel(channel);
    };
  }, [enabled]);

  async function toggleSound() {
    if (enabled) {
      setEnabled(false);
      await audioRef.current?.suspend();
      return;
    }
    try {
      const context = audioRef.current ?? new AudioContext();
      audioRef.current = context;
      await context.resume(); // Must run directly from the button gesture to unlock browser audio.
      if (context.state !== "running") throw new Error("Audio unavailable");
      setEnabled(true);
      toast.success("Aviso sonoro ativado para novos pedidos");
    } catch {
      toast.error("Não foi possível ativar o som. Verifique o áudio do navegador.");
    }
  }

  async function testSound() {
    try {
      const context = audioRef.current ?? new AudioContext();
      audioRef.current = context;
      await context.resume(); // A click unlocks audio even before order alerts are enabled.
      if (context.state !== "running") throw new Error("Audio unavailable");
      playAlert(context);
      setTesting(true);
      if (testTimerRef.current) clearTimeout(testTimerRef.current);
      testTimerRef.current = setTimeout(() => setTesting(false), ALERT_DURATION * 1000);
    } catch {
      toast.error("Não foi possível reproduzir o som. Verifique o áudio do navegador.");
    }
  }

  return (
    <div className="flex shrink-0 items-center gap-1">
      <Button
        type="button"
        variant={enabled ? "secondary" : "outline"}
        size="sm"
        onClick={() => void toggleSound()}
        title={enabled ? "Desativar aviso sonoro de novos pedidos" : "Ativar aviso sonoro de novos pedidos"}
        aria-pressed={enabled}
      >
        {enabled ? <Bell /> : <BellOff />}
        <span className="hidden sm:inline">{enabled ? "Som ligado" : "Ativar som"}</span>
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => void testSound()}
        disabled={testing}
        title="Testar aviso sonoro de novos pedidos"
        aria-label="Testar som"
      >
        <Volume2 />
        <span className="hidden md:inline">Testar som</span>
      </Button>
    </div>
  );
}