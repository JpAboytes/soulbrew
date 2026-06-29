import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Menu from './pages/Menu'
import FidelidadPublica from './pages/FidelidadPublica'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Menu />} />
        <Route path="/fidelidad/:telefono" element={<FidelidadPublica />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
