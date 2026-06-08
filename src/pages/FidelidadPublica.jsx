import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Coffee, Star, Trophy, Gift } from 'lucide-react'
import { supabase } from '../lib/supabase'

function getLevel(puntos) {
  if (puntos >= 300) return { msg: '¡Cliente VIP! Gracias por tu preferencia', Icon: Trophy, color: '#D4A853' }
  if (puntos >= 100) return { msg: '¡Ya tienes una recompensa disponible!', Icon: Gift, color: '#22c55e' }
  return { msg: '¡Estás empezando tu aventura!', Icon: Star, color: '#8B5A3C' }
}

export default function FidelidadPublica() {
  const { telefono } = useParams()
  const [state, setState] = useState({ status: 'loading', cliente: null, historial: [], error: null })

  useEffect(() => {
    if (!telefono) {
      setState({ status: 'not_found', cliente: null, historial: [], error: null })
      return
    }

    let cancelled = false

    async function fetchData() {
      // Aseguramos que la sesión esté resuelta para usar el rol correcto
      await supabase.auth.getSession()

      const { data: cliente, error: errCliente } = await supabase
        .from('clientes')
        .select('id, nombre, telefono, puntos_acumulados, visitas, created_at')
        .eq('telefono', telefono)
        .maybeSingle()

      if (cancelled) return

      if (errCliente) {
        setState({ status: 'error', cliente: null, historial: [], error: errCliente.message })
        return
      }

      if (!cliente) {
        setState({ status: 'not_found', cliente: null, historial: [], error: null })
        return
      }

      const { data: historial, error: errHistorial } = await supabase
        .from('puntos_historial')
        .select('puntos, concepto, created_at')
        .eq('cliente_id', cliente.id)
        .gt('puntos', 0)
        .order('created_at', { ascending: false })
        .limit(5)

      if (cancelled) return

      if (errHistorial) {
        // El cliente existe pero el historial falló — mostramos el cliente igualmente
        setState({ status: 'ok', cliente, historial: [], error: null })
        return
      }

      setState({ status: 'ok', cliente, historial: historial ?? [], error: null })
    }

    fetchData().catch(err => {
      if (!cancelled) {
        setState({ status: 'error', cliente: null, historial: [], error: err?.message ?? 'Error inesperado' })
      }
    })

    return () => { cancelled = true }
  }, [telefono])

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (state.status === 'loading') return (
    <div className="min-h-screen bg-[#2C1810] flex flex-col items-center justify-center gap-4">
      <div className="bg-[#D4A853] p-3 rounded-2xl">
        <Coffee size={28} className="text-[#2C1810]" />
      </div>
      <div className="animate-spin rounded-full h-8 w-8 border-4 border-[#D4A853] border-t-transparent" />
    </div>
  )

  // ── Error técnico ─────────────────────────────────────────────────────────────
  if (state.status === 'error') return (
    <div className="min-h-screen bg-[#2C1810] flex items-center justify-center p-6">
      <div className="bg-[#FAFAF7] rounded-3xl p-8 text-center max-w-sm w-full">
        <Coffee size={40} className="text-red-400 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-[#2C1810]">Algo salió mal</h2>
        <p className="text-gray-500 mt-2 text-sm">{state.error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-5 bg-[#D4A853] text-[#2C1810] font-bold px-6 py-3 rounded-xl w-full min-h-[48px]"
        >
          Reintentar
        </button>
      </div>
    </div>
  )

  // ── No encontrado ─────────────────────────────────────────────────────────────
  if (state.status === 'not_found') return (
    <div className="min-h-screen bg-[#2C1810] flex items-center justify-center p-6">
      <div className="bg-[#FAFAF7] rounded-3xl p-8 text-center max-w-sm w-full">
        <Coffee size={48} className="text-[#D4A853] mx-auto mb-4" />
        <h2 className="text-xl font-bold text-[#2C1810]">No encontrado</h2>
        <p className="text-gray-500 mt-2 text-sm">
          No hay cuenta de fidelización con el número <strong>{telefono}</strong>.
        </p>
        <p className="text-xs text-[#8B5A3C] mt-4">
          Visítanos y pide registrarte en caja.
        </p>
      </div>
    </div>
  )

  // ── Vista de tarjeta ──────────────────────────────────────────────────────────
  const { cliente, historial } = state
  const puntos = cliente.puntos_acumulados
  const progressInTier = puntos % 100
  const recompensasDisponibles = Math.floor(puntos / 100)
  const level = getLevel(puntos)
  const LevelIcon = level.Icon

  return (
    <div className="min-h-screen bg-[#2C1810] py-8 px-4 flex justify-center">
      <div className="w-full max-w-sm">

        {/* Header de la cafetería */}
        <div className="flex items-center gap-3 mb-6 px-1">
          <div className="bg-[#D4A853] p-2.5 rounded-xl">
            <Coffee size={22} className="text-[#2C1810]" />
          </div>
          <div>
            <h1 className="text-white font-bold text-xl">Soulbrew</h1>
            <p className="text-[#8B5A3C] text-xs">Tarjeta de fidelización</p>
          </div>
        </div>

        {/* Tarjeta principal */}
        <div className="bg-[#FAFAF7] rounded-3xl p-6 shadow-2xl">

          {/* Datos del cliente */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-14 h-14 rounded-2xl bg-[#D4A853]/20 flex items-center justify-center shrink-0">
              <span className="text-2xl font-bold text-[#D4A853]">
                {cliente.nombre.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#2C1810]">{cliente.nombre}</h2>
              <p className="text-sm text-[#8B5A3C]">
                {cliente.visitas} visita{cliente.visitas !== 1 ? 's' : ''}
              </p>
            </div>
          </div>

          {/* Puntos destacados */}
          <div className="text-center bg-[#2C1810] rounded-2xl py-6 px-4 mb-5">
            <p className="text-[#8B5A3C] text-sm mb-1">Puntos disponibles</p>
            <p className="text-6xl font-bold text-[#D4A853] leading-none tabular-nums">{puntos}</p>
            {recompensasDisponibles > 0 && (
              <p className="text-green-400 text-sm mt-3 font-semibold">
                🎁 {recompensasDisponibles} recompensa{recompensasDisponibles > 1 ? 's' : ''} disponible{recompensasDisponibles > 1 ? 's' : ''}
              </p>
            )}
          </div>

          {/* Barra de progreso */}
          <div className="mb-5">
            <div className="flex justify-between text-xs text-gray-500 mb-2">
              <span>{progressInTier} / 100 pts</span>
              <span>
                {progressInTier === 0 && puntos > 0
                  ? '¡Tier completado!'
                  : `Faltan ${100 - progressInTier} pts`
                }
              </span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
              <div
                className="h-full bg-[#D4A853] rounded-full transition-all duration-700"
                style={{ width: `${progressInTier === 0 && puntos > 0 ? 100 : progressInTier}%` }}
              />
            </div>
            <p className="text-xs text-center text-gray-400 mt-1.5">100 puntos = $10 de descuento</p>
          </div>

          {/* Badge de nivel */}
          <div
            className="flex items-center gap-2.5 p-3.5 rounded-2xl mb-5"
            style={{ backgroundColor: `${level.color}18` }}
          >
            <LevelIcon size={18} style={{ color: level.color }} className="shrink-0" />
            <p className="text-sm font-semibold" style={{ color: level.color }}>{level.msg}</p>
          </div>

          {/* Historial de visitas */}
          {historial.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-[#2C1810] mb-3">Últimas visitas</h3>
              <div className="divide-y divide-gray-50">
                {historial.map((h, i) => (
                  <div key={i} className="flex justify-between items-center py-2.5">
                    <div>
                      <p className="text-sm font-medium text-[#2C1810] capitalize">{h.concepto}</p>
                      <p className="text-xs text-gray-400">
                        {new Date(h.created_at).toLocaleDateString('es-MX', {
                          day: 'numeric', month: 'short', year: 'numeric',
                        })}
                      </p>
                    </div>
                    <span className="font-bold text-sm text-[#D4A853]">+{h.puntos} pts</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {historial.length === 0 && (
            <p className="text-xs text-gray-400 text-center py-2">
              Aún no hay visitas registradas con puntos
            </p>
          )}
        </div>

        <p className="text-center text-[#5C3317] text-xs mt-5 px-4">
          Presenta tu número en caja para canjear puntos
        </p>
      </div>
    </div>
  )
}
