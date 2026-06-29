import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import FidelidadPublica from './pages/FidelidadPublica'

// Pantalla simple para cualquier ruta que no sea una tarjeta de fidelización.
function Inicio() {
  return (
    <div className="min-h-screen bg-[#42241A] flex items-center justify-center p-6">
      <div className="bg-[#FAFAF7] rounded-3xl p-8 text-center max-w-sm w-full">
        <img src="/logo-light.png" alt="Soulbrew" className="h-20 w-auto mx-auto mb-5" />
        <p className="text-gray-500 mt-2 text-sm">
          Escanea el QR de tu tarjeta o pide tu enlace de fidelización en caja.
        </p>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/fidelidad/:telefono" element={<FidelidadPublica />} />
        <Route path="/" element={<Inicio />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
