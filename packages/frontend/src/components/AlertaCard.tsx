import { AlertTriangle, Cloud, Cpu, ListChecks, Share2 } from "lucide-react";
import { severidadColor, severidadLabel, type Alerta } from "@/lib/mock-data";

const motorIcon = {
  nube: Cloud,
  dispositivo: Cpu,
  reglas: ListChecks,
};

const motorLabel = {
  nube: "Modelo en la nube",
  dispositivo: "Sensor en campo",
  reglas: "Regla local",
};

export function AlertaCard({ alerta }: { alerta: Alerta }) {
  const MotorIcon = motorIcon[alerta.motor];
  return (
    <article className={`rounded-2xl border p-4 ${severidadColor[alerta.severidad]}`}>
      <div className="flex items-center justify-between gap-3">
        <span className="inline-flex items-center gap-2 rounded-full bg-background/40 px-3 py-1 text-xs font-bold uppercase tracking-wide">
          <AlertTriangle className="h-3.5 w-3.5" />
          Severidad {alerta.severidad} · {severidadLabel[alerta.severidad]}
        </span>
        <span className="text-xs font-medium opacity-80">{alerta.fecha}</span>
      </div>

      <h3 className="mt-3 text-lg font-bold text-foreground">{alerta.titulo}</h3>
      <p className="mt-1 text-base text-foreground/90">{alerta.mensaje}</p>

      <div className="mt-3 rounded-xl bg-background/50 p-3">
        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Acción recomendada</p>
        <p className="mt-1 text-base font-semibold text-foreground">{alerta.accion}</p>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <MotorIcon className="h-4 w-4" /> {motorLabel[alerta.motor]}
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