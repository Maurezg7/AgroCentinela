import { useState, useEffect } from "react";
import { Bell, MapPin, Camera, WifiOff, ChevronRight, Loader2, AlertCircle } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { subscribeToPush, checkPushStatus, type PushStatus } from "@/services/push-subscription";
import { useAppStore } from "@/stores/app-store";

export default function Ajustes() {
  const isOnline = useAppStore((s) => s.isOnline);
  const pendingSyncCount = useAppStore((s) => s.pendingSyncCount);
  const [pushStatus, setPushStatus] = useState<PushStatus | 'loading' | 'error'>('loading');
  const [pushError, setPushError] = useState<string | null>(null);

  useEffect(() => {
    checkPushStatus().then(setPushStatus).catch(() => setPushStatus('unavailable'));
  }, []);

  const handleEnablePush = async () => {
    setPushStatus('loading');
    setPushError(null);
    try {
      const result = await subscribeToPush();
      setPushStatus(result);
    } catch (err) {
      setPushStatus('error');
      setPushError(err instanceof Error ? err.message : 'Error desconocido');
    }
  };

  const pushLabel = {
    subscribed: 'Activadas',
    unsubscribed: 'Permiso concedido, sin suscripción',
    denied: 'Denegadas por el navegador',
    unavailable: 'No disponible en este navegador',
    loading: 'Verificando…',
    error: 'Error al suscribir',
  };

  const showAction = pushStatus === 'unsubscribed' || pushStatus === 'error';

  return (
    <AppShell title="Ajustes">
      <p className="text-muted-foreground text-sm md:text-base -mt-2 mb-4">Gestioná permisos y sincronización. La app funciona aunque estés sin conexión.</p>
      <section className="pb-8">
        <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-muted-foreground">Permisos</h2>
        <ul className="flex flex-col gap-2">
          <PermisoRow icon={MapPin} label="Ubicación" estado="Verificar en uso" ok />
          <PermisoRow icon={Camera} label="Cámara" estado="Verificar en uso" ok />

          <li className="rounded-2xl border border-border bg-card px-4 py-4">
            <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3">
              <div className={`grid h-11 w-11 place-items-center rounded-xl ${pushStatus === 'subscribed' ? 'bg-primary/15 text-primary' : 'bg-warning/15 text-warning'}`}>
                <Bell className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold">Notificaciones push</p>
                <p className={`text-sm ${pushStatus === 'subscribed' ? 'text-primary' : 'text-warning'}`}>
                  {pushLabel[pushStatus] ?? pushStatus}
                </p>
              </div>
              {pushStatus === 'loading' && <Loader2 className="h-5 w-5 animate-spin text-primary" />}
              {showAction && (
                <button onClick={handleEnablePush}
                  className="min-h-[44px] px-3 rounded-lg bg-primary text-primary-foreground text-sm font-semibold">
                  {pushStatus === 'error' ? 'Reintentar' : 'Activar'}
                </button>
              )}
            </div>
            {pushError && (
              <div className="mt-3 flex items-start gap-2 text-sm text-red-400">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <p>{pushError}</p>
              </div>
            )}
          </li>
        </ul>

        <h2 className="mt-8 mb-2 text-sm font-bold uppercase tracking-wide text-muted-foreground">Sincronización</h2>
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-3">
            <WifiOff className={`h-5 w-5 ${isOnline ? 'text-primary' : 'text-warning'}`} />
            <div className="min-w-0">
              <p className="font-semibold">{isOnline ? 'Conectado' : 'Sin conexión'}</p>
              <p className="text-sm text-muted-foreground">
                {pendingSyncCount === 0
                  ? 'Todo sincronizado'
                  : `${pendingSyncCount} ${pendingSyncCount === 1 ? 'operación pendiente' : 'operaciones pendientes'}`}
              </p>
            </div>
          </div>
        </div>
      </section>
    </AppShell>
  );
}

function PermisoRow({
  icon: Icon, label, estado, ok = false,
}: {
  icon: typeof Bell; label: string; estado: string; ok?: boolean;
}) {
  return (
    <li className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 min-h-[72px] rounded-2xl border border-border bg-card px-4">
      <div className={`grid h-11 w-11 place-items-center rounded-xl ${ok ? 'bg-primary/15 text-primary' : 'bg-warning/15 text-warning'}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="font-semibold">{label}</p>
        <p className={`text-sm ${ok ? 'text-primary' : 'text-warning'}`}>{estado}</p>
      </div>
      <ChevronRight className="h-5 w-5 text-muted-foreground" />
    </li>
  );
}
