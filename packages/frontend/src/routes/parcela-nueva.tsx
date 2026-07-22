import { Link } from "react-router-dom";
import { ArrowLeft, MapPin, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";

type GpsState = "obtenida" | "buscando" | "denegado";

const cultivos = ["Soja", "Maíz", "Poroto"] as const;
const etapas = ["Siembra", "Emergencia", "Vegetativo", "Floración", "Llenado", "Madurez"] as const;

export default function NuevaParcela() {
  const [gps, setGps] = useState<GpsState>("obtenida");
  const [cultivo, setCultivo] = useState<string>("Soja");
  const [etapa, setEtapa] = useState<string>("Vegetativo");

  return (
    <AppShell>
      <header className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3 pt-6 pb-4">
        <Link
          to="/"
          className="grid h-12 w-12 place-items-center rounded-xl bg-card border border-border"
          aria-label="Volver"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="truncate text-2xl font-bold">Nueva parcela</h1>
      </header>

      <form className="flex flex-col gap-6 pb-10" onSubmit={(e) => e.preventDefault()}>
        <Field label="Nombre de la parcela">
          <input
            type="text"
            placeholder="Ej. Lote Norte"
            className="w-full min-h-[56px] rounded-xl border border-input bg-card px-4 text-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </Field>

        <Field label="Cultivo">
          <ChipGroup options={cultivos as unknown as string[]} value={cultivo} onChange={setCultivo} />
        </Field>

        <Field label="Etapa fenológica">
          <ChipGroup options={etapas as unknown as string[]} value={etapa} onChange={setEtapa} />
        </Field>

        <Field label="Hectáreas">
          <input
            type="number"
            inputMode="decimal"
            placeholder="0"
            className="w-full min-h-[56px] rounded-xl border border-input bg-card px-4 text-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </Field>

        <Field label="Ubicación">
          <button
            type="button"
            onClick={() => setGps(gps === "obtenida" ? "buscando" : gps === "buscando" ? "denegado" : "obtenida")}
            className="w-full inline-flex items-center justify-center gap-3 min-h-[64px] rounded-xl bg-primary text-primary-foreground text-lg font-semibold"
          >
            <MapPin className="h-6 w-6" /> Usar mi ubicación
          </button>

          {gps === "obtenida" && (
            <div className="mt-3 flex items-start gap-3 rounded-xl border border-primary/40 bg-primary/10 p-4 text-primary">
              <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="font-semibold">Ubicación obtenida</p>
                <p className="text-sm opacity-90">-24.7821, -65.4232 · precisión ±8 m</p>
              </div>
            </div>
          )}

          {gps === "buscando" && (
            <div className="mt-3 flex items-center gap-3 rounded-xl border border-border bg-card p-4 text-muted-foreground">
              <Loader2 className="h-5 w-5 shrink-0 animate-spin" />
              <p>Buscando señal GPS…</p>
            </div>
          )}

          {gps === "denegado" && (
            <div className="mt-3 rounded-xl border border-warning/40 bg-warning/10 p-4 text-warning">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="font-semibold">Permiso de ubicación denegado</p>
                  <p className="text-sm opacity-90 mt-1">
                    Ingresá las coordenadas manualmente o habilitá el permiso desde el navegador.
                  </p>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <input placeholder="Latitud" className="min-h-[56px] rounded-xl border border-input bg-background px-3 text-foreground" />
                <input placeholder="Longitud" className="min-h-[56px] rounded-xl border border-input bg-background px-3 text-foreground" />
              </div>
            </div>
          )}
        </Field>

        <button type="submit" className="mt-2 w-full min-h-[64px] rounded-xl bg-primary text-primary-foreground text-lg font-bold">
          Guardar parcela
        </button>
      </form>
    </AppShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-base font-semibold text-foreground">{label}</span>
      {children}
    </label>
  );
}

function ChipGroup({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const active = opt === value;
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            className={`min-h-[56px] px-5 rounded-xl border text-base font-semibold ${
              active
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card text-foreground border-border"
            }`}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}
