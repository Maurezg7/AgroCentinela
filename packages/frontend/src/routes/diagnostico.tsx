import { useState, useRef, useEffect } from "react";
import { Camera, Info, CameraOff, Upload, Loader2 } from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import { AppShell } from "@/components/AppShell";
import { useCamera } from "@/hooks/use-camera";
import { resizeAndExport, fileToCanvas } from "@/lib/image-utils";
import { analyzeImageTriage } from "@/lib/image-triage";
import { getDB } from "@/services/idb-store";
import type { TriageResult } from "@agrocentinela/shared";

type View = 'camera' | 'processing' | 'result';

export default function DiagnosticoPage() {
  const camera = useCamera();
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [view, setView] = useState<View>('camera');
  const [triage, setTriage] = useState<TriageResult | null>(null);

  // Start camera when camera view is active and video element is mounted
  useEffect(() => {
    if (view !== 'camera') return;
    // Small delay to ensure video element is in DOM after state change
    const timer = setTimeout(() => {
      if (videoRef.current && camera.status !== 'active') {
        camera.start(videoRef.current);
      }
    }, 50);
    return () => clearTimeout(timer);
  }, [view]); // eslint-disable-line react-hooks/exhaustive-deps

  // Cleanup: stop camera on unmount (navigating away)
  useEffect(() => {
    return () => { camera.stop(); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function handleRetake() {
    setView('camera');
    setTriage(null);
    // camera.start will be triggered by the useEffect above
  }

  async function handleCapture() {
    const canvas = camera.capture();
    if (!canvas) return;
    camera.stop();
    await processCanvas(canvas);
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const canvas = await fileToCanvas(file);
    await processCanvas(canvas);
  }

  async function processCanvas(canvas: HTMLCanvasElement) {
    setView('processing');
    const blob = await resizeAndExport(canvas);
    const triageResult = analyzeImageTriage(canvas);
    setTriage(triageResult);

    // Persist to IDB
    const db = await getDB();
    const id = uuidv4();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (db as any).put('diagnosis', {
      id,
      parcelId: '',
      imageKey: id,
      triage: triageResult,
      createdAt: new Date().toISOString(),
      status: 'pending',
    });

    // Store blob for later upload
    await db.put('config', { key: `diagnosis-blob-${id}`, value: URL.createObjectURL(blob) });

    setView('result');
  }

  return (
    <AppShell title="Diagnóstico">
      {view === 'camera' && (
        <div className="pb-8">
          {camera.status === 'denied' ? (
            <DeniedView onPickFile={() => fileInputRef.current?.click()} />
          ) : (
            <div className="mx-auto w-full max-w-sm">
              <div className="relative aspect-[3/4] w-full overflow-hidden rounded-2xl border border-border bg-black">
                <video
                  ref={videoRef}
                  className="absolute inset-0 w-full h-full object-cover"
                  playsInline
                  muted
                />
                <div className="absolute inset-8 rounded-2xl border-2 border-dashed border-primary/70 pointer-events-none" />
                <div className="absolute top-4 left-4 right-4 rounded-lg bg-background/80 px-3 py-2 text-sm text-foreground">
                  Encuadrá la hoja afectada dentro del marco
                </div>
              </div>
              <button type="button" onClick={handleCapture}
                className="mt-6 w-full min-h-[72px] rounded-2xl bg-primary text-primary-foreground text-lg font-bold inline-flex items-center justify-center gap-3">
                <Camera className="h-6 w-6" /> Capturar foto
              </button>
            </div>
          )}
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
        </div>
      )}

      {view === 'processing' && (
        <div className="flex flex-col items-center py-16 gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-lg font-semibold">Analizando imagen…</p>
        </div>
      )}

      {view === 'result' && triage && (
        <div className="pb-8 mx-auto w-full max-w-sm">
          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="text-sm font-semibold text-muted-foreground">Diagnóstico preliminar (triage local)</p>
            <div className="mt-4 grid grid-cols-2 gap-4">
              <Stat label="Píxeles verdes" value={`${(triage.greenRatio * 100).toFixed(0)}%`} />
              <Stat label="Amarillo/marrón" value={`${(triage.yellowBrownRatio * 100).toFixed(0)}%`} />
            </div>
            <div className="mt-4">
              <p className="text-sm text-muted-foreground">Severidad preliminar</p>
              <p className={`text-2xl font-bold mt-1 ${
                triage.preliminarySeverity === 1 ? 'text-primary' :
                triage.preliminarySeverity === 2 ? 'text-yellow-500' : 'text-red-400'
              }`}>
                {triage.preliminarySeverity === 1 ? 'Baja' :
                 triage.preliminarySeverity === 2 ? 'Moderada' : 'Alta'}
              </p>
            </div>

            <div className="mt-4 flex items-start gap-3 rounded-xl border border-border bg-background p-3 text-sm text-muted-foreground">
              <Info className="h-4 w-4 shrink-0 mt-0.5" />
              <p>Este análisis es orientativo y no reemplaza la evaluación de un ingeniero agrónomo. El análisis completo con IA se realizará cuando recuperes conexión.</p>
            </div>
          </div>

          <button type="button" onClick={handleRetake}
            className="mt-4 w-full min-h-[56px] rounded-xl border border-border bg-card text-foreground font-semibold">
            Tomar otra foto
          </button>
        </div>
      )}
    </AppShell>
  );
}

function DeniedView({ onPickFile }: { onPickFile: () => void }) {
  return (
    <div className="pt-10 text-center">
      <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-warning/15 text-warning">
        <CameraOff className="h-10 w-10" />
      </div>
      <h2 className="mt-6 text-xl font-bold">Permiso de cámara denegado</h2>
      <p className="mt-2 text-base text-muted-foreground max-w-xs mx-auto">
        Podés subir una imagen desde la galería para hacer el análisis.
      </p>
      <button onClick={onPickFile}
        className="mt-8 min-h-[56px] px-6 rounded-xl bg-primary text-primary-foreground font-semibold inline-flex items-center gap-2">
        <Upload className="h-5 w-5" /> Subir desde galería
      </button>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-background p-3 text-center">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-xl font-bold mt-1">{value}</p>
    </div>
  );
}
