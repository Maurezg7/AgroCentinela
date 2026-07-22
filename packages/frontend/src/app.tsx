import { BrowserRouter, Routes, Route } from 'react-router-dom';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<div>AgroCentinela</div>} />
      </Routes>
    </BrowserRouter>
  );
}
