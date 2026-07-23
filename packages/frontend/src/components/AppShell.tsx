import { Link, useLocation } from "react-router-dom";
import { Sprout, Bell, Camera, Settings, WifiOff, RefreshCw } from "lucide-react";
import type { ReactNode } from "react";
import { useAppStore } from "@/stores/app-store";

type Props = {
  children: ReactNode;
  title?: string;
  headerRight?: ReactNode;
};

const navItems = [
  { to: "/", label: "Parcelas", icon: Sprout, exact: true },
  { to: "/alertas", label: "Alertas", icon: Bell },
  { to: "/diagnostico", label: "Diagnóstico", icon: Camera },
  { to: "/ajustes", label: "Ajustes", icon: Settings },
];

export function AppShell({ children, title, headerRight }: Props) {
  const { pathname } = useLocation();
  const isOnline = useAppStore((s) => s.isOnline);
  const pendingSyncCount = useAppStore((s) => s.pendingSyncCount);
  const showBanner = !isOnline || pendingSyncCount > 0;

  return (
    <div className="min-h-screen bg-background text-foreground pb-[88px]">
      <div className="max-w-md mx-auto">
      {showBanner && (
        <div
          className={`sticky top-0 z-30 flex items-center gap-3 px-4 py-3 text-base font-medium border-b ${
            !isOnline
              ? "bg-warning/15 text-warning border-warning/40"
              : "bg-primary/10 text-primary border-primary/30"
          }`}
        >
          {!isOnline ? <WifiOff className="h-5 w-5 shrink-0" /> : <RefreshCw className="h-5 w-5 shrink-0" />}
          <span className="min-w-0 truncate">
            {!isOnline
              ? "Sin conexión · mostrando datos guardados"
              : `${pendingSyncCount} ${pendingSyncCount === 1 ? "operación pendiente" : "operaciones pendientes"} de sincronizar`}
          </span>
        </div>
      )}

      {title && (
        <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-5 pt-6 pb-4">
          <h1 className="truncate text-2xl font-bold tracking-tight">{title}</h1>
          {headerRight}
        </header>
      )}

      <main className="px-5">{children}</main>
      </div>

      <nav className="fixed bottom-0 inset-x-0 z-40 border-t border-border bg-card">
        <ul className="grid grid-cols-4 max-w-md mx-auto">
          {navItems.map((item) => {
            const active = item.exact
              ? pathname === item.to
              : pathname.startsWith(item.to);
            const Icon = item.icon;
            return (
              <li key={item.to}>
                <Link
                  to={item.to}
                  className={`flex flex-col items-center justify-center gap-1 min-h-[72px] px-2 py-2 text-xs font-medium ${
                    active ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  <Icon className="h-6 w-6" strokeWidth={active ? 2.4 : 2} />
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
