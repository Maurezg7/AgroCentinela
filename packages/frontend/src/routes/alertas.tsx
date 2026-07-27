import { AppShell } from "@/components/AppShell";
import { AlertaCard } from "@/components/AlertaCard";
import { useAlerts } from "@/hooks/use-alerts";
import { Bell } from "lucide-react";

export default function AlertasPage() {
  const { alerts, loading } = useAlerts();

  return (
    <AppShell title="Alertas">
      <p className="text-muted-foreground text-sm md:text-base -mt-2 mb-4">Todas las alertas de tus parcelas, ordenadas por fecha. Se guardan localmente para consultarlas sin señal.</p>
      {loading ? (
        <div className="flex flex-col gap-3 md:grid md:grid-cols-2 md:gap-4">
          {[1, 2].map((i) => (
            <div key={i} className="rounded-2xl border border-border bg-card p-4 animate-pulse">
              <div className="h-4 w-1/3 rounded bg-muted" />
              <div className="mt-3 h-5 w-3/4 rounded bg-muted" />
              <div className="mt-3 h-12 w-full rounded-xl bg-muted" />
            </div>
          ))}
        </div>
      ) : alerts.length === 0 ? (
        <div className="flex flex-col items-center text-center pt-16">
          <div className="grid h-20 w-20 place-items-center rounded-full bg-primary/15 text-primary">
            <Bell className="h-10 w-10" />
          </div>
          <h2 className="mt-6 text-xl font-bold">Sin alertas</h2>
          <p className="mt-2 text-base text-muted-foreground max-w-xs">
            Las alertas aparecen cuando se detecta riesgo de helada o estrés hídrico en tus parcelas.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3 pb-8 md:grid md:grid-cols-2 md:gap-4">
          {alerts.map((a) => (
            <li key={a.id}>
              <AlertaCard alerta={a} />
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}
