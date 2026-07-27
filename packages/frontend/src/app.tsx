import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useAppInit } from '@/hooks/use-app-init';
import Gate from '@/routes/gate';
import NuevaParcela from '@/routes/parcela-nueva';
import ParcelaDetalle from '@/routes/parcela-detalle';
import AlertasPage from '@/routes/alertas';
import DiagnosticoPage from '@/routes/diagnostico';
import Ajustes from '@/routes/ajustes';
import Landing from '@/routes/landing';
import NotFound from '@/routes/not-found';

export function App() {
  useAppInit();

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Gate />} />
        <Route path="/inicio" element={<Landing />} />
        <Route path="/parcelas/nueva" element={<NuevaParcela />} />
        <Route path="/parcelas/:id" element={<ParcelaDetalle />} />
        <Route path="/alertas" element={<AlertasPage />} />
        <Route path="/diagnostico" element={<DiagnosticoPage />} />
        <Route path="/ajustes" element={<Ajustes />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}
