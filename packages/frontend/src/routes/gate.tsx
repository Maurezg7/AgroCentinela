import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { getDB } from '@/services/idb-store';
import ParcelasList from '@/routes/index';

type GateState = 'loading' | 'landing' | 'app';

export default function Gate() {
  const [state, setState] = useState<GateState>('loading');

  useEffect(() => {
    async function check() {
      try {
        const db = await getDB();
        const count = await db.count('parcels');
        setState(count > 0 ? 'app' : 'landing');
      } catch {
        // IDB failed — show app (safe default for returning users)
        setState('app');
      }
    }
    check();
  }, []);

  if (state === 'loading') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
          <p className="text-sm text-muted-foreground">Cargando…</p>
        </div>
      </div>
    );
  }

  if (state === 'landing') {
    return <Navigate to="/inicio" replace />;
  }

  return <ParcelasList />;
}
