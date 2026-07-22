import { useState } from "react";
import { Camera, Info, WifiOff, RefreshCw, CameraOff } from "lucide-react";
import { AppShell } from "@/components/AppShell";

type Vista = "camara" | "resultado" | "offline" | "sin_permiso";

export default function DiagnosticoPage() {
  const [vista, setVista] = useState<Vista>("camara");

  return (
    <AppShell title="Diagnóstico">
      <div className="mb-4 flex flex-wrap gap-2">
        {(["camara", "resultado", "offline", "sin_permiso"] as Vista[]).map((v) => (
          <button
            key={v}
            onClick={() => setVista(v)}
            className={`px-3 min-h-[44px] rounded-lg text-sm font-semibold border ${
              vista === v ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-muted-foreground"
            }`}
          >
            {v === "camara" ? "Cámara" : v === "resultado" ? "Resultado" : v === "offline" ? "Sin conexión" : "Sin permiso"}
          </button>
        ))}
      </div>

      {vista === "camara" && <VistaCamara />}
      {vista === "resultado" && <VistaResultado online />}
      {vista === "offline" && <VistaResultado online={false} />}
      {vista === "sin_permiso" && <SinPermiso />}
    </AppShell>
  );
}

function VistaCamara() {
  return (
    <div className="pb-8">
      <div className="relative aspect-[3/4] w-full overflow-hidden rounded-2xl border border-border bg-black">
        <div className="absolute inset-0 grid place-items-center text-muted-foreground">
          <Camera className="h-16 w-16 opacity-30" />
        </div>
        <div className="absolute inset-8 rounded-2xl border-2 border-dashed border-primary/70" />
        <div className="absolute top-4 left-4 right-4 rounded-lg bg-background/80 px-3 py-2 text-sm text-foreground">
          Encuadrá la hoja afectada dentro del marco
        </div>
      </div>
      <button
        type="button"
        className="mt-6 w-full min-h-[72px] rounded-2xl bg-primary text-primary-foreground text-lg font-bold inline-flex items-center justify-center gap-3"
      >
        <Camera className="h-6 w-6" /> Capturar foto
      </button>
    </div>
  );
}

function VistaResultado({ online }: { online: boolean }) {
  return (
    <div className="pb-8">
      {!online && (
        <div className="mb-4 flex items-start gap-3 rounded-xl border border-warning/40 bg-warning/10 p-4 text-warning">
          <WifiOff className="h-5 w-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Resultado preliminar sin conexión</p>
            <p className="text-sm opacity-90 mt-1 inline-flex items-center gap-1.5">
              <RefreshCw className="h-3.5 w-3.5" /> Se completará cuando recuperes señal.
            </p>
          </div>
        </div>
      )}

      <div className="aspect-[4/3] w-full rounded-2xl bg-gradient-to-br from-primary/30 to-warning/20 border border-border" />

      <div className="mt-4 rounded-2xl border border-border bg-card p-5">
        <p className="text-sm font-semibold text-muted-foreground">Diagnóstico preliminar</p>
        <h2 className="mt-1 text-2xl font-bold">Posible roya asiática</h2>

        <div className="mt-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Nivel de confianza</span>
            <span className="font-bold text-primary">{online ? "78%" : "42%"}</span>
          </div>
          <div className="mt-2 h-3 w-full rounded-full bg-background overflow-hidden">
            <div className="h-full bg-primary" style={{ width: online ? "78%" : "42%" }} />
          </div>
        </div>

        <div className="mt-4 flex items-start gap-3 rounded-xl border border-border bg-background p-3 text-sm text-muted-foreground">
          <Info className="h-4 w-4 shrink-0 mt-0.5" />
          <p>Este diagnóstico es orientativo y no reemplaza la evaluación de un ingeniero agrónomo.</p>
        </div>
      </div>
    </div>
  );
}

function SinPermiso() {
  return (
    <div className="pt-10 text-center">
      <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-warning/15 text-warning">
        <CameraOff className="h-10 w-10" />
      </div>
      <h2 className="mt-6 text-xl font-bold">Permiso de cámara denegado</h2>
      <p className="mt-2 text-base text-muted-foreground max-w-xs mx-auto">
        Para usar el diagnóstico por foto necesitás habilitar el acceso a la cámara desde los ajustes del navegador.
      </p>
      <button className="mt-8 min-h-[56px] px-6 rounded-xl bg-primary text-primary-foreground font-semibold">
        Reintentar permiso
      </button>
    </div>
  );
}
