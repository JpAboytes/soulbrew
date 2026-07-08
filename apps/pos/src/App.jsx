import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import Login from './pages/Login'
import Inventario from './pages/Inventario'
import Productos from './pages/Productos'
import Vender from './pages/Vender'
import Clientes from './pages/Clientes'
import Reportes from './pages/Reportes'
import Notificaciones from './pages/Notificaciones'
// Asistente deshabilitado temporalmente (se retoma después). Se conserva pages/Asistente.jsx.
// import Asistente from './pages/Asistente'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />

          {/* Protected routes */}
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/vender" element={<Vender />} />
              <Route path="/inventario" element={<Inventario />} />
              <Route path="/productos" element={<Productos />} />
              <Route path="/clientes" element={<Clientes />} />
              <Route path="/reportes" element={<Reportes />} />
              <Route path="/notificaciones" element={<Notificaciones />} />
              {/* Asistente deshabilitado temporalmente:
              <Route path="/asistente" element={<Asistente />} /> */}
              <Route path="/" element={<Navigate to="/vender" replace />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
