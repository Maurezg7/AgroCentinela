import ParcelasList from '@/routes/index';

/**
 * Gate simplified: always show the app.
 * Landing at /inicio is informational only, linked from external sources.
 * First-time users see the empty state with "Crear parcela" CTA.
 */
export default function Gate() {
  return <ParcelasList />;
}
