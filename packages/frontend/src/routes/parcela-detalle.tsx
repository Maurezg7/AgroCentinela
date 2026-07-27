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
  const [checkResult, setCheckResult] = useState<{ type: 'safe' | 'info' | 'error'; message: string } | null>(null);

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
      setCheckResult({ type: 'error', message: 'Sin conexión y sin pronóstico cacheado. Conectate para descargarlo.' });
      setChecking(false);
      return;
    }

    try {
      const result = await generateAlert(id, parcel.crop, parcel.stage, climate);
      if (result.alert) {
        await refreshAlerts();
        setCheckResult(null);
      } else if (result.reason === 'deduplicated') {
        setCheckResult({ type: 'info', message: 'Ya hay una alerta reciente para esta condición. No se generó una nueva.' });
      } else if (result.reason === 'no_climate') {
        setCheckResult({ type: 'error', message: 'Sin datos de clima. Tocá de nuevo para reintentar.' });
      } else {
        // No risk — show green "safe" card with explanation
        const minTemp = climate ? Math.min(...climate.hourly48h.map(h => h.temperature2m)).toFixed(1) : '?';
        setCheckResult({
          type: 'safe',
          message: `Sin riesgo detectado. La temperatura mínima prevista es ${minTemp}°C (por encima del umbral de helada de 3°C) y no hay indicadores de estrés hídrico.`,
        });
      }

      // Refresh climate data after check (backend may have ingested fresh data)
      if (isOnline) {
        try {
          const fresh = await apiClient.getClimate(id);
          setClimate(fresh);
          updateAge(fresh);
          const db = await getDB();
          await db.put('climate', fresh);
        } catch { /* keep existing */ }
      }
    } catch {
      setCheckResult({ type: 'error', message: 'Error al analizar riesgo. Intentá de nuevo.' });
    } finally {
      setChecking(false);
    }
  }

  if (!parcel) return <AppShell><p className="py-16 text-center text-muted-foreground">Cargando parcela…</p></AppShell>;

  return (
    <AppShell>
      <header className="grid grid-cols-[auto_auto_minmax(0,1fr)] items-center gap-3 pt-6 pb-4">
        <Link to="/" className="grid h-12 w-12 place-items-center rounded-xl bg-card border border-border" aria-label="Volver">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <img src="/logo.svg" className="h-8 w-8" alt="AgroCentinela" />
        <div className="min-w-0">
          <h1 className="truncate text-2xl md:text-3xl font-bold">{parcel.name}</h1>
          <p className="truncate text-sm text-muted-foreground">
            {cropLabel(parcel.crop)} · {stageLabel(parcel.stage)} · {parcel.hectares} ha
          </p>
        </div>
      </header>

      <section className="pb-6">
        <div className="mb-1 flex items-center justify-between">
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
        <p className="text-muted-foreground text-sm md:text-base mb-3">
          Consultá el pronóstico y la lectura de la IA para cada una de tus parcelas. Sin señal estable, los datos se cachean localmente.
        </p>

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
          className="w-full min-h-[56px] rounded-xl bg-gradient-ember text-primary-foreground font-semibold inline-flex items-center justify-center gap-3 disabled:opacity-60 shadow-glow transition hover:brightness-110 active:scale-[0.98]"
        >
          {checking ? <Loader2 className="h-5 w-5 animate-spin" /> : <ShieldCheck className="h-5 w-5" />}
          {checking ? "Analizando riesgo…" : "Chequear riesgo"}
        </button>
        {checkResult && (
          <div className={`mt-3 flex items-start gap-3 rounded-xl border p-4 text-sm ${
            checkResult.type === 'safe'
              ? 'bg-safe/10 text-safe border-safe/30'
              : checkResult.type === 'error'
              ? 'bg-danger/10 text-danger border-danger/30'
              : 'bg-card text-muted-foreground border-border'
          }`}>
            <span className="text-lg">{checkResult.type === 'safe' ? '✅' : checkResult.type === 'error' ? '⚠️' : 'ℹ️'}</span>
            <p className="font-medium">{checkResult.message}</p>
          </div>
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
