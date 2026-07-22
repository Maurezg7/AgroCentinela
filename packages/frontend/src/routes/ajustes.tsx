import { Bell, MapPin, Camera, WifiOff, ChevronRight } from "lucide-react";
import { AppShell } from "@/components/AppShell";

export default function Ajustes() {
  return (
    <AppShell title="Ajustes">
      <section className="pb-8">
        <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-muted-foreground">Permisos</h2>
        <ul className="flex flex-col gap-2">
          <PermisoRow icon={MapPin} label="Ubicación" estado="Concedido" ok />
          <PermisoRow icon={Camera} label="Cámara" estado="Denegado" />
          <PermisoRow icon={Bell} label="Notificaciones" estado="Denegado" />
        </ul>

        <h2 className="mt-8 mb-2 text-sm font-bold uppercase tracking-wide text-muted-foreground">Sincronización</h2>
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-3">
            <WifiOff className="h-5 w-5 text-warning" />
            <div className="min-w-0">
              <p className="font-semibold">Sin conexión</p>
              <p className="text-sm text-muted-foreground">2 operaciones esperando sincronizar</p>
            </div>
          </div>
          <button className="mt-4 w-full min-h-[56px] rounded-xl bg-primary text-primary-foreground font-semibold">
            Reintentar sincronización
          </button>
        </div>
      </section>
    </AppShell>
  );
}

function PermisoRow({
  icon: Icon,
  label,
  estado,
  ok = false,
}: {
  icon: typeof Bell;
  label: string;
  estado: string;
  ok?: boolean;
}) {
  return (
    <li className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 min-h-[72px] rounded-2xl border border-border bg-card px-4">
      <div className={`grid h-11 w-11 place-items-center rounded-xl ${ok ? "bg-primary/15 text-primary" : "bg-warning/15 text-warning"}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="font-semibold">{label}</p>
        <p className={`text-sm ${ok ? "text-primary" : "text-warning"}`}>{estado}</p>
      </div>
      <ChevronRight className="h-5 w-5 text-muted-foreground" />
    </li>
  );
}
