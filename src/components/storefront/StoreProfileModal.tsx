import { Clock, CreditCard, MapPin, QrCode } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  useBusinessHours,
  DEFAULT_BUSINESS_HOURS,
  DAY_LABELS_LONG,
} from "@/hooks/use-business-hours";

const ADDRESS = "Rua Rodrigo Brandão, nº 32, Cachoeira - BA";
const MAP_QUERY = encodeURIComponent("Rua Rodrigo Brandão, 32, Cachoeira - BA");
const MAP_EMBED =
  "https://www.openstreetmap.org/export/embed.html?bbox=-38.9760%2C-12.6070%2C-38.9600%2C-12.5930&layer=mapnik&marker=-12.6000%2C-38.9680";

const dayLabel = (d: number) => {
  const name = DAY_LABELS_LONG[d];
  const label = d >= 1 && d <= 5 ? `${name}-feira` : name;
  return label.charAt(0).toUpperCase() + label.slice(1);
};

export function StoreProfileModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { data: hours } = useBusinessHours();
  const h = hours ?? DEFAULT_BUSINESS_HOURS;
  const days = [...h.days].sort((a, b) => a - b);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] max-w-lg overflow-y-auto rounded-3xl p-0">
        <div className="bg-brand px-5 py-5 text-brand-foreground">
          <DialogTitle className="font-display text-xl leading-tight">
            Meissa Vieira Confeitaria
          </DialogTitle>
          <DialogDescription className="text-xs uppercase tracking-[0.2em] text-brand-foreground/80">
            Perfil da loja
          </DialogDescription>
        </div>

        <div className="space-y-6 px-5 pb-6 pt-5">
          <section>
            <SectionTitle icon={<Clock className="h-4 w-4" />} title="Horário de atendimento" />
            <ul className="mt-3 divide-y divide-border overflow-hidden rounded-xl border border-border">
              {days.length === 0 ? (
                <li className="px-4 py-3 text-sm text-muted-foreground">Sem horários definidos.</li>
              ) : (
                days.map((d) => (
                  <li key={d} className="flex items-center justify-between px-4 py-3 text-sm">
                    <span className="text-card-foreground">{dayLabel(d)}</span>
                    <span className="font-semibold text-foreground">
                      {h.open}h às {h.close}h
                    </span>
                  </li>
                ))
              )}
            </ul>
          </section>

          <section>
            <SectionTitle icon={<CreditCard className="h-4 w-4" />} title="Formas de pagamento" />
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <PaymentItem
                icon={<QrCode className="h-4 w-4" />}
                label="Pix"
                hint="Pagamento online"
              />
              <PaymentItem
                icon={<CreditCard className="h-4 w-4" />}
                label="Cartão"
                hint="Crédito / Débito"
              />
            </div>
          </section>

          <section>
            <SectionTitle icon={<MapPin className="h-4 w-4" />} title="Endereço e localização" />
            <p className="mt-2 text-sm text-muted-foreground">{ADDRESS}</p>
            <div className="mt-3 overflow-hidden rounded-xl border border-border">
              <iframe
                title="Mapa da loja"
                src={MAP_EMBED}
                loading="lazy"
                className="h-56 w-full border-0"
              />
            </div>
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${MAP_QUERY}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-brand px-4 py-2 text-sm font-semibold text-brand-foreground hover:brightness-110"
            >
              <MapPin className="h-4 w-4" /> Ver rota no mapa
            </a>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SectionTitle({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-foreground">
      <span className="text-brand">{icon}</span>
      {title}
    </h3>
  );
}

function PaymentItem({
  icon,
  label,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  hint: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
      <span className="text-brand">{icon}</span>
      <div className="min-w-0">
        <div className="text-sm font-semibold text-card-foreground">{label}</div>
        <div className="text-xs text-muted-foreground">{hint}</div>
      </div>
    </div>
  );
}
