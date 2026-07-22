import { AppShell } from "@/components/AppShell";
import { AlertaCard } from "@/components/AlertaCard";
import { alertas } from "@/lib/mock-data";

export default function AlertasPage() {
  return (
    <AppShell title="Alertas" offline pendientes={0}>
      <ul className="flex flex-col gap-3 pb-8">
        {alertas.map((a) => (
          <li key={a.id}>
            <AlertaCard alerta={a} />
          </li>
        ))}
      </ul>
    </AppShell>
  );
}
