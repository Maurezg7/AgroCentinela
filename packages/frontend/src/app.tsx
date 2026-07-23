import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useAppInit } from '@/hooks/use-app-init';
import ParcelasList from '@/routes/index';
import NuevaParcela from '@/routes/parcela-nueva';
import ParcelaDetalle from '@/routes/parcela-detalle';
import AlertasPage from '@/routes/alertas';
import DiagnosticoPage from '@/routes/diagnostico';
import Ajustes from '@/routes/ajustes';

export function App() {
  useAppInit();

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ParcelasList />} />
        <Route path="/parcelas/nueva" element={<NuevaParcela />} />
        <Route path="/parcelas/:id" element={<ParcelaDetalle />} />
        <Route path="/alertas" element={<AlertasPage />} />
        <Route path="/diagnostico" element={<DiagnosticoPage />} />
        <Route path="/ajustes" element={<Ajustes />} />
      </Routes>
    </BrowserRouter>
  );
}
