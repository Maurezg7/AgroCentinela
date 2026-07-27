import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDB } from '@/services/idb-store';

export default function NotFound() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  async function handleGoHome() {
    setLoading(true);
    try {
      const db = await getDB();
      const count = await db.count('parcels');
      navigate(count > 0 ? '/' : '/inicio', { replace: true });
    } catch {
      navigate('/', { replace: true });
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center px-5">
      <img src="/logo.svg" className="h-16 w-16 mb-6" alt="AgroCentinela" />
      <h1 className="font-display text-7xl md:text-9xl font-bold tracking-tight text-primary">
        404
      </h1>
      <p className="mt-4 text-center text-lg md:text-xl text-foreground/80 max-w-md">
        Esta página no existe o no está disponible.
      </p>
      <button
        type="button"
        onClick={handleGoHome}
        disabled={loading}
        className="mt-8 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-ember px-6 py-3.5 text-base font-semibold text-primary-foreground shadow-glow transition hover:brightness-110 active:scale-[0.98] disabled:opacity-60"
      >
        {loading ? (
          <div className="h-5 w-5 rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground animate-spin" />
        ) : null}
        {loading ? 'Cargando…' : 'Volver al inicio'}
      </button>
    </div>
  );
}
