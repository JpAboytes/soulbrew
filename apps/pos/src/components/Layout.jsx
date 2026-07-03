import { NavLink, Outlet } from 'react-router-dom'
import { ShoppingCart, Package, Coffee, LogOut, Users, Sparkles, BarChart3, Bell } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

export default function Layout() {
  const { user, signOut } = useAuth()
  const [criticalCount, setCriticalCount] = useState(0)

  useEffect(() => {
    fetchCriticalCount()

    const channel = supabase
      .channel('insumos-nav')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'insumos' }, fetchCriticalCount)
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [])

  async function fetchCriticalCount() {
    const { data } = await supabase.from('insumos').select('id, stock_actual, stock_minimo')
    if (data) {
      setCriticalCount(data.filter(i => i.stock_actual <= i.stock_minimo).length)
    }
  }

  const navItems = [
    { to: '/vender', icon: ShoppingCart, label: 'Vender' },
    { to: '/inventario', icon: Package, label: 'Inventario', badge: criticalCount },
    { to: '/productos', icon: Coffee, label: 'Productos' },
    { to: '/clientes', icon: Users, label: 'Clientes' },
    { to: '/reportes', icon: BarChart3, label: 'Reportes' },
    { to: '/notificaciones', icon: Bell, label: 'Notificaciones' },
    { to: '/asistente', icon: Sparkles, label: 'Asistente' },
  ]

  return (
    <div className="flex min-h-screen bg-[#FAFAF7]">
      {/* Sidebar */}
      <aside className="w-64 bg-[#42241A] flex flex-col shrink-0">
        <div className="p-6 border-b border-[#5C3A28]">
          <div className="bg-[#FAFAF7] rounded-2xl px-4 py-3 flex items-center justify-center shadow-sm">
            <img src="/logo-light.png" alt="Soulbrew" className="h-12 w-auto" />
          </div>
          <p className="text-[#7C5A43] text-xs mt-2 pl-0.5">Cafetería</p>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {navItems.map(({ to, icon: Icon, label, badge }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl transition-all min-h-[52px] relative ${
                  isActive
                    ? 'bg-[#4E5B3D] text-[#FAFAF7] font-semibold'
                    : 'text-[#FAFAF7] hover:bg-[#5C3A28]'
                }`
              }
            >
              <Icon size={22} />
              <span className="text-base">{label}</span>
              {badge > 0 && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 bg-red-600 text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1">
                  {badge}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-[#5C3A28]">
          <p className="text-[#7C5A43] text-xs mb-3 truncate px-2">{user?.email}</p>
          <button
            onClick={signOut}
            className="flex items-center gap-2 text-[#FAFAF7] hover:text-red-400 transition-colors min-h-[44px] w-full px-2 rounded-xl hover:bg-[#5C3A28]"
          >
            <LogOut size={18} />
            <span className="text-sm">Cerrar sesión</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto min-w-0">
        <Outlet />
      </main>
    </div>
  )
}
