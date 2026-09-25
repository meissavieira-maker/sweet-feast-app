import { useEffect, useRef, useState } from "react";
import { Bell, BellOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

const ALERT_DURATION = 7;

function playOrderChime(context: AudioContext) {
  const start = context.currentTime + 0.02;
  // An original three-note notification chime, repeated for seven seconds.
  for (let pulse = 0; pulse < 7; pulse++) {
    for (const [offset, frequency] of [[0, 659], [0.18, 784], [0.38, 988]]) {
      const at = start + pulse + offset;
      if (at >= start + ALERT_DURATION) continue;
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.exponentialRampToValueAtTime(0.18, at + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.16);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(at);
      oscillator.stop(at + 0.17);
      oscillator.onended = () => {
        oscillator.disconnect();
        gain.disconnect();
      };
    }
  }
}

export function OrderSoundAlert() {
  const [enabled, setEnabled] = useState(false);
  const audioRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    return () => {
      void audioRef.current?.close();
      audioRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    let checking = false;
    const seen = new Set<string>();
    let channel: ReturnType<typeof supabase.channel> | undefined;

    function announce(id: string) {
      if (seen.has(id) || cancelled) return;
      seen.add(id);
      const context = audioRef.current;
      if (context?.state === "running") playOrderChime(context);
      toast.info("Novo pedido recebido!", { duration: 7000 });
    }

    async function checkOrders(initial = false) {
      if (checking) return;
      checking = true;
      const { data, error } = await supabase
        .from("orders")
        .select("id")
        .order("created_at", { ascending: false })
        .limit(100);
      checking = false;
      if (cancelled) return;
      if (error) {
        if (initial) toast.error("Não foi possível acompanhar novos pedidos.");
        return;
      }
      if (initial) {
        for (const order of data ?? []) seen.add(order.id);
      } else {
        // Oldest first so simultaneous orders are announced in arrival order.
        for (const order of [...(data ?? [])].reverse()) announce(order.id);
      }
    }

    async function start() {
      await checkOrders(true); // Existing orders must never ring when the alert is switched on.
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

  return (
    <Button
      type="button"
      variant={enabled ? "secondary" : "outline"}
      size="sm"
      onClick={() => void toggleSound()}
      title={enabled ? "Desativar aviso sonoro de novos pedidos" : "Ativar aviso sonoro de novos pedidos"}
      aria-pressed={enabled}
      className="shrink-0"
    >
      {enabled ? <Bell /> : <BellOff />}
      <span className="hidden sm:inline">{enabled ? "Som ligado" : "Ativar som"}</span>
    </Button>
  );
}