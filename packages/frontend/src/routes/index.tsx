import { Link } from "react-router-dom";
import { Plus, ChevronRight, Sprout, AlertTriangle } from "lucide-react";
import { useState, useEffect } from "react";
import { AppShell } from "@/components/AppShell";
import { useParcels } from "@/hooks/use-parcels";
import { cropLabel, stageLabel } from "@/lib/labels";
import { getDB } from "@/services/idb-store";
import type { Alert } from "@agrocentinela/shared";

const severityColor: Record<number, string> = {
  1: "bg-frost/10 text-frost border-frost/25",
  2: "bg-frost/15 text-frost border-frost/30",
  3: "bg-warning/15 text-warning border-warning/30",
  4: "bg-warning/25 text-warning border-warning/50",
  5: "bg-danger/20 text-danger border-danger/50",
};

const severityLabel: Record<number, string> = {
  1: "Leve", 2: "Baja", 3: "Moderada", 4: "Alta", 5: "Crítica",
};

export default function ParcelasList() {
  const { parcels, loading } = useParcels();
  const [alertsByParcel, setAlertsByParcel] = useState<Record<string, Alert | null>>({});

  useEffect(() => {
    async function loadAlerts() {
      const db = await getDB();
      const all = await db.getAll('alerts');
      const map: Record<string, Alert | null> = {};
      for (const a of all) {
        const existing = map[a.parcelId];
        if (!existing || a.severity > existing.severity) {
          map[a.parcelId] = a;
        }
      }
      setAlertsByParcel(map);
    }
    if (parcels.length > 0) loadAlerts();
  }, [parcels]);

  return (
    <AppShell
      title="Mis parcelas"
      headerRight={
        <Link to="/parcelas/nueva"
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 min-h-[56px] text-primary-foreground font-semibold shadow-glow">
          <Plus className="h-5 w-5" /> Nueva
        </Link>
      }
    >
      {loading ? (
        <p className="text-muted-foreground text-center py-16">Cargando…</p>
      ) : parcels.length === 0 ? (
        <EmptyState />
      ) : (
        <ul className="flex flex-col gap-3 pb-8 md:grid md:grid-cols-2 md:gap-4">
          {parcels.map((p) => {
            const topAlert = alertsByParcel[p.id] ?? null;
            return (
              <li key={p.id}>
                <Link to={`/parcelas/${p.id}`}
                  className="block rounded-2xl border border-border bg-card p-5 active:scale-[0.99] transition">
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                    <div className="min-w-0">
                      <h2 className="truncate text-xl font-bold">{p.name}</h2>
                      <p className="mt-1 text-base text-muted-foreground">
                        {cropLabel(p.crop)} · {stageLabel(p.stage)} · {p.hectares} ha
                      </p>
                    </div>
                    <ChevronRight className="h-6 w-6 shrink-0 text-muted-foreground mt-1" />
                  </div>
                  {topAlert ? (
                    <div className={`mt-4 flex items-start gap-3 rounded-xl border p-3 ${severityColor[topAlert.severity]}`}>
                      <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <p className="text-xs font-bold uppercase tracking-wide">
                          {severityLabel[topAlert.severity]} · {topAlert.condition === 'helada' ? 'Helada' : 'Estrés hídrico'}
                        </p>
                        <p className="text-sm font-semibold mt-0.5">{topAlert.message}</p>
                      </div>
                    </div>
                  ) : (
                    <p className="mt-3 text-sm text-muted-foreground/60">Sin alertas activas</p>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </AppShell>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center text-center pt-16">
      <div className="grid h-20 w-20 place-items-center rounded-full bg-primary/15 text-primary">
        <Sprout className="h-10 w-10" />
      </div>
      <h2 className="mt-6 text-xl font-bold">Todavía no tenés parcelas</h2>
      <p className="mt-2 text-base text-muted-foreground max-w-xs">
        Cargá tu primera parcela para empezar a recibir alertas de clima y riesgos.
      </p>
      <Link to="/parcelas/nueva"
        className="mt-8 inline-flex items-center gap-2 rounded-xl bg-primary px-6 min-h-[56px] text-primary-foreground font-semibold">
        <Plus className="h-5 w-5" /> Crear parcela
      </Link>
    </div>
  );
}
