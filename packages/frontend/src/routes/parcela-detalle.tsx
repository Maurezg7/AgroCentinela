import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Sun, Cloud, CloudRain, CloudLightning, Clock } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { AlertaCard } from "@/components/AlertaCard";
import { parcelas, pronostico7d, alertas, type DiaPronostico } from "@/lib/mock-data";

const iconoMap = {
  sol: Sun,
  nube: Cloud,
  lluvia: CloudRain,
  tormenta: CloudLightning,
};

export default function ParcelaDetalle() {
  const { id } = useParams<{ id: string }>();
  const parcela = parcelas.find((p) => p.id === id) ?? parcelas[0];
  const alertasParcela = alertas.filter((a) => a.parcelaId === parcela.id);
  const datoVencido = false;

  return (
    <AppShell>
      <header className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3 pt-6 pb-4">
        <Link to="/" className="grid h-12 w-12 place-items-center rounded-xl bg-card border border-border" aria-label="Volver">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-bold">{parcela.nombre}</h1>
          <p className="truncate text-sm text-muted-foreground">
            {parcela.cultivo} · {parcela.etapa} · {parcela.hectareas} ha
          </p>
        </div>
      </header>

      <section className="pb-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold">Pronóstico 7 días</h2>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${
              datoVencido
                ? "bg-warning/15 text-warning border-warning/40"
                : "bg-card text-muted-foreground border-border"
            }`}
          >
            <Clock className="h-3.5 w-3.5" />
            {datoVencido ? "Datos vencidos" : "Actualizado hace 12 min"}
          </span>
        </div>
        <div className="-mx-5 overflow-x-auto">
          <div className="flex gap-3 px-5 pb-2">
            {pronostico7d.map((d) => (
              <DiaCard key={d.dia} dia={d} />
            ))}
          </div>
        </div>
      </section>

      <section className="pb-8">
        <h2 className="mb-3 text-lg font-bold">Alertas de esta parcela</h2>
        {alertasParcela.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-6 text-center text-muted-foreground">
            Sin alertas activas
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {alertasParcela.map((a) => (
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

function DiaCard({ dia }: { dia: DiaPronostico }) {
  const Icon = iconoMap[dia.icono];
  return (
    <div className="min-w-[112px] rounded-2xl border border-border bg-card p-4 text-center">
      <p className="text-sm font-semibold text-muted-foreground">{dia.dia}</p>
      <Icon className="mx-auto my-3 h-8 w-8 text-primary" />
      <p className="text-xl font-bold">{dia.max}°</p>
      <p className="text-sm text-muted-foreground">{dia.min}°</p>
      <p className="mt-2 text-sm font-semibold text-primary">{dia.lluvia} mm</p>
    </div>
  );
}
