import { AppShell } from "@/components/AppShell";
import { AlertaCard } from "@/components/AlertaCard";
import { useAlerts } from "@/hooks/use-alerts";
import { Bell } from "lucide-react";

export default function AlertasPage() {
  const { alerts, loading } = useAlerts();

  return (
    <AppShell title="Alertas">
      {loading ? (
        <p className="text-muted-foreground text-center py-16">Cargando…</p>
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
