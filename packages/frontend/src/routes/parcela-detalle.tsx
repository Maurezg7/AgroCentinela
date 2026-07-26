import { useParams, Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { ArrowLeft, Clock, AlertTriangle, ShieldCheck, Loader2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { AlertaCard } from "@/components/AlertaCard";
import { useAlerts } from "@/hooks/use-alerts";
import { useAiEngine } from "@/hooks/use-ai-engine";
import { getDB } from "@/services/idb-store";
import { apiClient } from "@/services/api-client";
import { useAppStore } from "@/stores/app-store";
import { cropLabel, stageLabel } from "@/lib/labels";
import type { Parcel, ClimateCache } from "@agrocentinela/shared";

export default function ParcelaDetalle() {
  const { id } = useParams<{ id: string }>();
  const isOnline = useAppStore((s) => s.isOnline);
  const [parcel, setParcel] = useState<Parcel | null>(null);
  const [climate, setClimate] = useState<ClimateCache | null>(null);
  const [climateAge, setClimateAge] = useState<string>("");
  const [expired, setExpired] = useState(false);
  const { alerts, refresh: refreshAlerts } = useAlerts(id);
  const { generateAlert } = useAiEngine();
  const [checking, setChecking] = useState(false);
  const [checkResult, setCheckResult] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    async function load() {
      const db = await getDB();
      const p = await db.get('parcels', id!);
      if (p) setParcel(p);

      // Load climate from IDB
      const cached = await db.get('climate', id!);
      if (cached) {
        setClimate(cached);
        updateAge(cached);
      }

      // Refresh from network
      if (isOnline) {
        try {
          const fresh = await apiClient.getClimate(id!);
          setClimate(fresh);
          await db.put('climate', fresh);
          updateAge(fresh);
        } catch { /* keep cached */ }
      }
    }
    load();
  }, [id, isOnline]);

  function updateAge(c: ClimateCache) {
    const fetchedMs = new Date(c.fetchedAt).getTime();
    const diffMin = Math.floor((Date.now() - fetchedMs) / 60_000);
    const isExpired = new Date(c.expiresAt).getTime() < Date.now();
    setExpired(isExpired);
    if (diffMin < 60) setClimateAge(`Actualizado hace ${diffMin} min`);
    else if (diffMin < 1440) setClimateAge(`Actualizado hace ${Math.floor(diffMin / 60)}h`);
    else setClimateAge(`Actualizado hace ${Math.floor(diffMin / 1440)}d`);
  }

  async function handleCheckRisk() {
    if (!id || !parcel) return;
    setChecking(true);
    setCheckResult(null);

    // Offline without cached climate: can't do anything locally
    if (!isOnline && !climate) {
      setCheckResult('Sin conexión y sin pronóstico cacheado. Conectate para descargarlo.');
      setChecking(false);
      return;
    }

    try {
      const result = await generateAlert(id, parcel.crop, parcel.stage, climate);
      if (result.alert) {
        await refreshAlerts();
        setCheckResult(null);
      } else {
        setCheckResult(
          result.reason === 'deduplicated'
            ? 'Ya hay una alerta reciente para esta condición.'
            : 'Sin riesgo detectado para esta parcela.',
        );
      }
    } catch {
      setCheckResult('Error al analizar riesgo. Intentá de nuevo.');
    } finally {
      setChecking(false);
    }
  }

  if (!parcel) return <AppShell><p className="py-16 text-center text-muted-foreground">Cargando parcela…</p></AppShell>;

  return (
    <AppShell>
      <header className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3 pt-6 pb-4">
        <Link to="/" className="grid h-12 w-12 place-items-center rounded-xl bg-card border border-border" aria-label="Volver">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-bold">{parcel.name}</h1>
          <p className="truncate text-sm text-muted-foreground">
            {cropLabel(parcel.crop)} · {stageLabel(parcel.stage)} · {parcel.hectares} ha
          </p>
        </div>
      </header>

      <section className="pb-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold">Pronóstico 7 días</h2>
          {climate && (
            <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${
              expired ? "bg-warning/15 text-warning border-warning/40" : "bg-card text-muted-foreground border-border"
            }`}>
              <Clock className="h-3.5 w-3.5" />
              {expired ? "Datos vencidos" : climateAge}
            </span>
          )}
        </div>

        {expired && (
          <div className="mb-3 flex items-start gap-3 rounded-xl border border-warning/40 bg-warning/10 p-3 text-warning text-sm">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <p>Estos datos tienen más de 7 días. Se actualizarán con conexión.</p>
          </div>
        )}

        {climate ? (
          <div className="-mx-5 overflow-x-auto">
            <div className="flex gap-3 px-5 pb-2">
              {climate.days.map((d) => (
                <div key={d.date} className="min-w-[112px] rounded-2xl border border-border bg-card p-4 text-center">
                  <p className="text-sm font-semibold text-muted-foreground">{formatDayLabel(d.date)}</p>
                  <p className="mt-2 text-xl font-bold">{d.temperatureMax}°</p>
                  <p className="text-sm text-muted-foreground">{d.temperatureMin}°</p>
                  <p className="mt-2 text-sm font-semibold text-primary">{d.precipitationSum} mm</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">Sin datos de pronóstico disponibles.</p>
        )}
      </section>

      <section className="pb-4">
        <button
          type="button"
          disabled={checking}
          onClick={handleCheckRisk}
          className="w-full min-h-[56px] rounded-xl bg-primary text-primary-foreground font-semibold inline-flex items-center justify-center gap-3 disabled:opacity-60 shadow-glow"
        >
          {checking ? <Loader2 className="h-5 w-5 animate-spin" /> : <ShieldCheck className="h-5 w-5" />}
          {checking ? "Analizando riesgo…" : "Chequear riesgo"}
        </button>
        {checkResult && (
          <p className="mt-3 text-sm text-center text-muted-foreground bg-card rounded-xl border border-border p-3">{checkResult}</p>
        )}
      </section>

      <section className="pb-8">
        <h2 className="mb-3 text-lg font-bold">Alertas de esta parcela</h2>
        {alerts.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-6 text-center text-muted-foreground">
            Sin alertas activas
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {alerts.map((a) => (
              <li key={a.id}>
                <AlertaCard alerta={a} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </AppShell>
  );
}

function formatDayLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00Z');
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return 'Hoy';
  return d.toLocaleDateString('es-AR', { weekday: 'short' });
}
