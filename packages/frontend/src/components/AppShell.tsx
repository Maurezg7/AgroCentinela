import { Link, useLocation } from "react-router-dom";
import { Sprout, Bell, Camera, Settings, WifiOff, RefreshCw } from "lucide-react";
import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  offline?: boolean;
  pendientes?: number;
  title?: string;
  headerRight?: ReactNode;
};

const navItems = [
  { to: "/", label: "Parcelas", icon: Sprout, exact: true },
  { to: "/alertas", label: "Alertas", icon: Bell },
  { to: "/diagnostico", label: "Diagnóstico", icon: Camera },
  { to: "/ajustes", label: "Ajustes", icon: Settings },
];

export function AppShell({ children, offline = false, pendientes = 0, title, headerRight }: Props) {
  const { pathname } = useLocation();

  return (
    <div className="min-h-screen bg-background text-foreground pb-[88px]">
      {(offline || pendientes > 0) && (
        <div
          className={`sticky top-0 z-30 flex items-center gap-3 px-4 py-3 text-base font-medium border-b ${
            offline
              ? "bg-warning/15 text-warning border-warning/40"
              : "bg-primary/10 text-primary border-primary/30"
          }`}
        >
          {offline ? <WifiOff className="h-5 w-5 shrink-0" /> : <RefreshCw className="h-5 w-5 shrink-0" />}
          <span className="min-w-0 truncate">
            {offline
              ? "Sin conexión · mostrando datos guardados"
              : `${pendientes} ${pendientes === 1 ? "operación pendiente" : "operaciones pendientes"} de sincronizar`}
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

      <nav className="fixed bottom-0 inset-x-0 z-40 border-t border-border bg-card">
        <ul className="grid grid-cols-4">
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
