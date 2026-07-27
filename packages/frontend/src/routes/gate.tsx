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

        // Check if user has visited before (mark in config store)
        const visited = await db.get('config', 'hasVisited');
        if (visited) {
          // Returning user: always show app (even with 0 parcels)
          setState('app');
          return;
        }

        // First ever visit: check if there are parcels
        const count = await db.count('parcels');
        if (count > 0) {
          setState('app');
        } else {
          // Mark as visited so next time we don't redirect again
          await db.put('config', { key: 'hasVisited', value: 'true' });
          setState('landing');
        }
      } catch {
        setState('app');
      }
    }
    check();
  }, []);

  if (state === 'loading') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-10 w-10 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
      </div>
    );
  }

  if (state === 'landing') {
    return <Navigate to="/inicio" replace />;
  }

  return <ParcelasList />;
}
