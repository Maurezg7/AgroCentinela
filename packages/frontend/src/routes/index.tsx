import { Link } from "react-router-dom";
import { Plus, ChevronRight, Sprout, AlertTriangle } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { parcelas, severidadColor, severidadLabel } from "@/lib/mock-data";

export default function ParcelasList() {
  const empty = false;
  return (
    <AppShell
      offline={false}
      pendientes={2}
      title="Mis parcelas"
      headerRight={
        <Link
          to="/parcelas/nueva"
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 min-h-[56px] text-primary-foreground font-semibold shadow-lg shadow-primary/20"
        >
          <Plus className="h-5 w-5" /> Nueva
        </Link>
      }
    >
      {empty ? <EmptyState /> : (
        <ul className="flex flex-col gap-3 pb-8">
          {parcelas.map((p) => (
            <li key={p.id}>
              <Link
                to={`/parcelas/${p.id}`}
                className="block rounded-2xl border border-border bg-card p-5 active:scale-[0.99] transition"
              >
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                  <div className="min-w-0">
                    <h2 className="truncate text-xl font-bold">{p.nombre}</h2>
                    <p className="mt-1 text-base text-muted-foreground">
                      {p.cultivo} · {p.etapa} · {p.hectareas} ha
                    </p>
                  </div>
                  <ChevronRight className="h-6 w-6 shrink-0 text-muted-foreground mt-1" />
                </div>
                {p.ultimaAlerta && (
                  <div
                    className={`mt-4 flex items-start gap-3 rounded-xl border p-3 ${severidadColor[p.ultimaAlerta.severidad]}`}
                  >
                    <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <p className="text-xs font-bold uppercase tracking-wide opacity-90">
                        {severidadLabel[p.ultimaAlerta.severidad]} · {p.ultimaAlerta.fecha}
                      </p>
                      <p className="text-sm font-semibold mt-0.5">{p.ultimaAlerta.titulo}</p>
                    </div>
                  </div>
                )}
              </Link>
            </li>
          ))}
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
      <Link
        to="/parcelas/nueva"
        className="mt-8 inline-flex items-center gap-2 rounded-xl bg-primary px-6 min-h-[56px] text-primary-foreground font-semibold"
      >
        <Plus className="h-5 w-5" /> Crear parcela
      </Link>
    </div>
  );
}
