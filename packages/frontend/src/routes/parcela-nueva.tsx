import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, MapPin, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useGeolocation } from "@/hooks/use-geolocation";
import { createParcel } from "@/services/parcels.service";
import { CROP_LABELS, STAGE_LABELS } from "@/lib/labels";

const CROPS = ['soja', 'maiz', 'poroto'] as const;
const STAGES = ['siembra', 'emergencia', 'vegetativo', 'floracion', 'llenado', 'madurez'] as const;

export default function NuevaParcela() {
  const navigate = useNavigate();
  const geo = useGeolocation();

  const [name, setName] = useState('');
  const [crop, setCrop] = useState<string>('soja');
  const [stage, setStage] = useState<string>('vegetativo');
  const [hectares, setHectares] = useState('');
  const [manualLat, setManualLat] = useState('');
  const [manualLon, setManualLon] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFieldErrors({});

    try {
      const coordinates = geo.result
        ? { lat: geo.result.lat, lon: geo.result.lon }
        : { lat: parseFloat(manualLat), lon: parseFloat(manualLon) };

      const result = await createParcel({
        name,
        crop,
        stage,
        hectares: parseFloat(hectares) || 0,
        coordinates,
      });

      if (!result.success) {
        setFieldErrors(result.fieldErrors);
        return;
      }
      navigate('/');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppShell>
      <header className="grid grid-cols-[auto_auto_minmax(0,1fr)] items-center gap-3 pt-6 pb-2">
        <Link to="/" className="grid h-12 w-12 place-items-center rounded-xl bg-card border border-border" aria-label="Volver">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <img src="/logo.svg" className="h-8 w-8" alt="AgroCentinela" />
        <h1 className="truncate text-2xl md:text-3xl font-bold">Nueva parcela</h1>
      </header>
      <p className="text-muted-foreground text-sm md:text-base mb-5">
        Cargá los datos básicos. Usá el GPS del celular para capturar la ubicación con precisión.
      </p>

      <form className="space-y-5 rounded-2xl border border-border bg-card p-5 sm:p-6 mb-10" onSubmit={handleSubmit}>
        <Field label="Nombre de la parcela" error={fieldErrors['name']} id="parcel-name">
          <input id="parcel-name" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej. Lote Norte"
            className="w-full rounded-xl border border-input bg-background px-4 py-3 text-base outline-none transition placeholder:text-muted-foreground focus:border-primary/60 focus:ring-2 focus:ring-primary/30" />
        </Field>

        <Field label="Cultivo" error={fieldErrors['crop']}>
          <ChipGroup options={CROPS as unknown as string[]} labels={CROP_LABELS} value={crop} onChange={setCrop} />
        </Field>

        <Field label="Etapa fenológica" error={fieldErrors['stage']}>
          <ChipGroup options={STAGES as unknown as string[]} labels={STAGE_LABELS} value={stage} onChange={setStage} />
        </Field>

        <Field label="Hectáreas" error={fieldErrors['hectares']} id="parcel-hectares">
          <input id="parcel-hectares" type="number" inputMode="decimal" value={hectares} onChange={(e) => setHectares(e.target.value)} placeholder="0"
            className="w-full rounded-xl border border-input bg-background px-4 py-3 text-base outline-none transition placeholder:text-muted-foreground focus:border-primary/60 focus:ring-2 focus:ring-primary/30" />
        </Field>

        <Field label="Ubicación" error={fieldErrors['coordinates'] || fieldErrors['coordinates.lat'] || fieldErrors['coordinates.lon']}>
          <button type="button" onClick={geo.request} disabled={geo.status === 'requesting'}
            className="w-full inline-flex items-center justify-center gap-3 min-h-[64px] rounded-xl border border-frost/40 bg-frost/10 text-frost text-lg font-semibold transition hover:bg-frost/20 disabled:opacity-60">
            {geo.status === 'requesting' ? <Loader2 className="h-6 w-6 animate-spin" /> : <MapPin className="h-6 w-6" />}
            {geo.status === 'requesting' ? 'Buscando señal GPS…' : 'Usar mi ubicación'}
          </button>

          {geo.status === 'success' && geo.result && (
            <div className="mt-3 flex items-start gap-3 rounded-xl border border-primary/40 bg-primary/10 p-4 text-primary">
              <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="font-semibold">Ubicación obtenida</p>
                <p className="text-sm opacity-90">{geo.result.lat.toFixed(4)}, {geo.result.lon.toFixed(4)} · precisión ±{Math.round(geo.result.accuracy)} m</p>
              </div>
            </div>
          )}

          {(geo.status === 'denied' || geo.status === 'timeout') && (
            <div className="mt-3 rounded-xl border border-warning/40 bg-warning/10 p-4 text-warning">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="font-semibold">{geo.status === 'denied' ? 'Permiso de ubicación denegado' : 'No se obtuvo señal GPS'}</p>
                  <p className="text-sm opacity-90 mt-1">
                    {geo.status === 'denied'
                      ? 'Necesitamos las coordenadas para mostrarte pronóstico y alertas precisas de tu parcela.'
                      : 'Podés reintentar o ingresar las coordenadas manualmente.'}
                  </p>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <input placeholder="Latitud" value={manualLat} onChange={(e) => setManualLat(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background px-4 py-3 text-base outline-none transition placeholder:text-muted-foreground focus:border-primary/60 focus:ring-2 focus:ring-primary/30" />
                <input placeholder="Longitud" value={manualLon} onChange={(e) => setManualLon(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background px-4 py-3 text-base outline-none transition placeholder:text-muted-foreground focus:border-primary/60 focus:ring-2 focus:ring-primary/30" />
              </div>
              {geo.status === 'timeout' && (
                <button type="button" onClick={geo.request} className="mt-3 w-full min-h-[48px] rounded-xl border border-primary text-primary font-semibold">
                  Reintentar
                </button>
              )}
            </div>
          )}
        </Field>

        <button type="submit" disabled={submitting}
          className="mt-2 w-full min-h-[64px] rounded-xl bg-gradient-ember text-primary-foreground text-lg font-bold shadow-glow transition hover:brightness-110 active:scale-[0.98] disabled:opacity-60">
          {submitting ? 'Guardando…' : 'Guardar parcela'}
        </button>
      </form>
    </AppShell>
  );
}

function Field({ label, error, children, id }: { label: string; error?: string; children: React.ReactNode; id?: string }) {
  return (
    <div className="block">
      <label htmlFor={id} className="mb-2 block text-base font-semibold text-foreground">{label}</label>
      {children}
      {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
    </div>
  );
}

function ChipGroup({
  options, labels, value, onChange,
}: {
  options: string[]; labels: Record<string, string>; value: string; onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const active = opt === value;
        return (
          <button key={opt} type="button" onClick={() => onChange(opt)}
            className={`min-h-[56px] px-5 rounded-xl border text-base font-semibold ${
              active ? "bg-primary text-primary-foreground border-primary" : "bg-card text-foreground border-border"
            }`}>
            {labels[opt] ?? opt}
          </button>
        );
      })}
    </div>
  );
}
