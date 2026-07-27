import { AlertTriangle, Cloud, Cpu, ListChecks, Share2 } from "lucide-react";
import type { Alert } from "@agrocentinela/shared";

const engineIcon = {
  bedrock: Cloud,
  'on-device': Cpu,
  rules: ListChecks,
};

const engineLabel = {
  bedrock: "Modelo en la nube",
  'on-device': "IA en dispositivo",
  rules: "Regla local",
};

const severityLabel: Record<number, string> = {
  1: "Leve", 2: "Baja", 3: "Moderada", 4: "Alta", 5: "Crítica",
};

const severityColor: Record<number, string> = {
  1: "bg-frost/10 text-frost border-frost/25",
  2: "bg-frost/15 text-frost border-frost/30",
  3: "bg-warning/15 text-warning border-warning/30",
  4: "bg-warning/25 text-warning border-warning/50",
  5: "bg-danger/20 text-danger border-danger/50",
};

const severityBadge: Record<number, string> = {
  1: "bg-frost text-frost-foreground",
  2: "bg-frost text-frost-foreground",
  3: "bg-warning text-warning-foreground",
  4: "bg-warning text-warning-foreground",
  5: "bg-destructive text-destructive-foreground",
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffH = Math.floor(diffMs / 3_600_000);
  if (diffH < 1) return "Hace menos de 1h";
  if (diffH < 24) return `Hace ${diffH}h`;
  return d.toLocaleDateString("es-AR", { day: "numeric", month: "short" });
}

export function AlertaCard({ alerta }: { alerta: Alert }) {
  const EngineIcon = engineIcon[alerta.engine];
  return (
    <article className={`rounded-2xl border p-4 transition hover:border-primary/40 ${severityColor[alerta.severity] ?? severityColor[3]}`}>
      <div className="flex items-center justify-between gap-3">
        <span className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-semibold shadow-lg ${severityBadge[alerta.severity] ?? severityBadge[3]}`}>
          <AlertTriangle className="h-3.5 w-3.5" />
          {severityLabel[alerta.severity]}
        </span>
        <span className="text-xs font-medium opacity-80">{formatDate(alerta.createdAt)}</span>
      </div>

      <h3 className="mt-3 text-lg font-bold text-foreground">{alerta.message}</h3>

      <div className="mt-3 rounded-xl bg-background/50 p-3">
        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Acción recomendada</p>
        <p className="mt-1 text-base font-semibold text-foreground">{alerta.recommendedAction}</p>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-foreground/70">
          <EngineIcon className="h-4 w-4" /> {engineLabel[alerta.engine]}
        </span>
        <button
          type="button"
          className="inline-flex items-center gap-2 min-h-[44px] px-3 rounded-lg bg-background/60 text-foreground text-sm font-semibold"
        >
          <Share2 className="h-4 w-4" /> Compartir
        </button>
      </div>
    </article>
  );
}
