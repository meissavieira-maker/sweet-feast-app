import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type BusinessHours = {
  /** 0 = domingo ... 6 = sábado */
  days: number[];
  open: string; // "14:00"
  close: string; // "18:00"
};

export const DEFAULT_BUSINESS_HOURS: BusinessHours = {
  days: [0],
  open: "14:00",
  close: "18:00",
};

export const DAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
export const DAY_LABELS_LONG = [
  "domingo",
  "segunda",
  "terça",
  "quarta",
  "quinta",
  "sexta",
  "sábado",
];

const TZ = "America/Bahia";

function parseHours(raw?: string): BusinessHours {
  if (!raw) return DEFAULT_BUSINESS_HOURS;
  try {
    const parsed = JSON.parse(raw) as Partial<BusinessHours>;
    return {
      days: Array.isArray(parsed.days) ? parsed.days.filter((d) => d >= 0 && d <= 6) : DEFAULT_BUSINESS_HOURS.days,
      open: typeof parsed.open === "string" ? parsed.open : DEFAULT_BUSINESS_HOURS.open,
      close: typeof parsed.close === "string" ? parsed.close : DEFAULT_BUSINESS_HOURS.close,
    };
  } catch {
    return DEFAULT_BUSINESS_HOURS;
  }
}

export function useBusinessHours() {
  return useQuery({
    queryKey: ["business-hours"],
    queryFn: async (): Promise<BusinessHours> => {
      const { data, error } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "business_hours")
        .maybeSingle();
      if (error) throw error;
      return parseHours(data?.value);
    },
    staleTime: 30_000,
  });
}

const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
};

const fmtHour = (hhmm: string) => {
  const [h, m] = hhmm.split(":");
  return Number(m) === 0 ? `${Number(h)}h` : `${Number(h)}h${m}`;
};

function nowInTz() {
  const parts = new Intl.DateTimeFormat("pt-BR", {
    timeZone: TZ,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
  const dayStr = new Intl.DateTimeFormat("en-US", { timeZone: TZ, weekday: "short" }).format(new Date());
  const map: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return { day: map[dayStr] ?? 0, minutes: hour * 60 + minute };
}

/** Mensagem de status combinando o horário configurado e o interruptor manual. */
export function storeStatus(hours: BusinessHours, manualOpen: boolean) {
  const { day, minutes } = nowInTz();
  const openMin = toMinutes(hours.open);
  const closeMin = toMinutes(hours.close);
  const openToday = hours.days.includes(day);
  const withinHours = openToday && minutes >= openMin && minutes < closeMin;

  if (!manualOpen) {
    return { open: false, message: "Loja fechada no momento" };
  }
  if (withinHours) {
    return { open: true, message: `Loja aberta agora — até ${fmtHour(hours.close)}` };
  }
  if (openToday && minutes < openMin) {
    return { open: false, message: `Loja fechada, abre hoje às ${fmtHour(hours.open)}` };
  }
  if (hours.days.length === 0) {
    return { open: false, message: "Loja fechada" };
  }
  // próximo dia de funcionamento
  for (let i = 1; i <= 7; i++) {
    const d = (day + i) % 7;
    if (hours.days.includes(d)) {
      const when = i === 1 ? "amanhã" : DAY_LABELS_LONG[d];
      return { open: false, message: `Loja fechada, abre ${when} às ${fmtHour(hours.open)}` };
    }
  }
  return { open: false, message: "Loja fechada" };
}
