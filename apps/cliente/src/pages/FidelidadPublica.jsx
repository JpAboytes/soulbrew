import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Coffee, Star, Trophy, Gift, Wallet } from 'lucide-react'
import { getNivel } from '@soulbrew/core'
import { supabase } from '../lib/supabase'

// Ícono de cada nivel (la lógica/umbrales viven en @soulbrew/core; la UI vive aquí).
const NIVEL_ICON = { vip: Trophy, recompensa: Gift, inicio: Star }

export default function FidelidadPublica() {
  const { telefono } = useParams()
  // El :telefono de la URL puede venir con espacios, guiones o prefijo (+52…); la BD guarda
  // 10 dígitos. Normalizamos a los últimos 10 antes de consultar.
  const tel = (telefono ?? '').replace(/\D/g, '').slice(-10)
  const [state, setState] = useState({ status: 'loading', cliente: null, historial: [], error: null })
  const [walletLoading, setWalletLoading] = useState(false)
  const [walletError, setWalletError] = useState(null)

  useEffect(() => {
    if (tel.length !== 10) {
      setState({ status: 'not_found', cliente: null, historial: [], error: null })
      return
    }

    let cancelled = false

    async function fetchData() {
      // RPC pública (SECURITY DEFINER): devuelve SOLO la fila de este teléfono (sin email)
      // + sus últimas 5 visitas con puntos, en una llamada. Reemplaza la lectura directa de
      // `clientes`/`puntos_historial`, que quedó cerrada a anon para no exponer toda la base.
      const { data, error } = await supabase.rpc('fidelidad_por_telefono', { p_telefono: tel })

      if (cancelled) return

      if (error) {
        setState({ status: 'error', cliente: null, historial: [], error: error.message })
        return
      }

      if (!data?.cliente) {
        setState({ status: 'not_found', cliente: null, historial: [], error: null })
        return
      }

      setState({ status: 'ok', cliente: data.cliente, historial: data.historial ?? [], error: null })
    }

    fetchData().catch(err => {
      if (!cancelled) {
        setState({ status: 'error', cliente: null, historial: [], error: err?.message ?? 'Error inesperado' })
      }
    })

    return () => { cancelled = true }
  }, [tel])

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (state.status === 'loading') return (
    <div className="min-h-screen bg-[#42241A] flex flex-col items-center justify-center gap-5">
      <img src="/logo-dark.png" alt="Soulbrew" className="h-16 w-auto" />
      <div className="animate-spin rounded-full h-8 w-8 border-4 border-[#4E5B3D] border-t-transparent" />
    </div>
  )

  // ── Error técnico ─────────────────────────────────────────────────────────────
  if (state.status === 'error') return (
    <div className="min-h-screen bg-[#42241A] flex items-center justify-center p-6">
      <div className="bg-[#FAFAF7] rounded-3xl p-8 text-center max-w-sm w-full">
        <Coffee size={40} className="text-red-400 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-[#42241A]">Algo salió mal</h2>
        <p className="text-gray-500 mt-2 text-sm">{state.error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-5 bg-[#4E5B3D] text-[#FAFAF7] font-bold px-6 py-3 rounded-xl w-full min-h-[48px]"
        >
          Reintentar
        </button>
      </div>
    </div>
  )

  // ── No encontrado ─────────────────────────────────────────────────────────────
  if (state.status === 'not_found') return (
    <div className="min-h-screen bg-[#42241A] flex items-center justify-center p-6">
      <div className="bg-[#FAFAF7] rounded-3xl p-8 text-center max-w-sm w-full">
        <img src="/logo-light.png" alt="Soulbrew" className="h-16 w-auto mx-auto mb-5" />
        <h2 className="text-xl font-bold text-[#42241A]">No encontrado</h2>
        <p className="text-gray-500 mt-2 text-sm">
          No hay cuenta de fidelización con el número <strong>{telefono}</strong>.
        </p>
        <a
          href="/"
          className="mt-5 inline-flex items-center justify-center bg-[#4E5B3D] text-[#FAFAF7] font-bold px-6 py-3 rounded-xl w-full min-h-[48px]"
        >
          Crear mi tarjeta
        </a>
        <p className="text-xs text-[#7C5A43] mt-3">
          O visítanos y pide registrarte en caja.
        </p>
      </div>
    </div>
  )

  // ── Vista de tarjeta ──────────────────────────────────────────────────────────
  const { cliente, historial } = state
  const puntos = cliente.puntos_acumulados
  const progressInTier = puntos % 100
  const recompensasDisponibles = Math.floor(puntos / 100)
  const level = getNivel(puntos)
  const LevelIcon = NIVEL_ICON[level.nivel]

  async function agregarAGoogleWallet() {
    setWalletError(null)
    setWalletLoading(true)
    try {
      const { data, error } = await supabase.functions.invoke('wallet-google-link', {
        body: { telefono: tel },
      })
      if (error) throw error
      if (!data?.saveUrl) throw new Error('No se recibió el enlace de Google Wallet')
      window.location.href = data.saveUrl
    } catch (err) {
      setWalletError(err.message || 'No se pudo generar la tarjeta')
      setWalletLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#42241A] py-8 px-4 flex justify-center">
      <div className="w-full max-w-sm">

        {/* Header de la cafetería */}
        <div className="mb-6 px-1">
          <img src="/logo-dark.png" alt="Soulbrew" className="h-12 w-auto" />
          <p className="text-[#AEBB92] text-xs mt-2">Tarjeta de fidelización</p>
        </div>

        {/* Tarjeta principal */}
        <div className="bg-[#FAFAF7] rounded-3xl p-6 shadow-2xl">

          {/* Datos del cliente */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-14 h-14 rounded-2xl bg-[#4E5B3D]/20 flex items-center justify-center shrink-0">
              <span className="text-2xl font-bold text-[#4E5B3D]">
                {cliente.nombre.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#42241A]">{cliente.nombre}</h2>
              <p className="text-sm text-[#7C5A43]">
                {cliente.visitas} visita{cliente.visitas !== 1 ? 's' : ''}
              </p>
            </div>
          </div>

          {/* Puntos destacados */}
          <div className="text-center bg-[#42241A] rounded-2xl py-6 px-4 mb-5">
            <p className="text-[#AEBB92] text-sm mb-1">Puntos disponibles</p>
            <p className="text-6xl font-bold text-[#AEBB92] leading-none tabular-nums">{puntos}</p>
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
                className="h-full bg-[#4E5B3D] rounded-full transition-all duration-700"
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
              <h3 className="text-sm font-bold text-[#42241A] mb-3">Últimas visitas</h3>
              <div className="divide-y divide-gray-50">
                {historial.map((h, i) => (
                  <div key={i} className="flex justify-between items-center py-2.5">
                    <div>
                      <p className="text-sm font-medium text-[#42241A] capitalize">{h.concepto}</p>
                      <p className="text-xs text-gray-400">
                        {new Date(h.created_at).toLocaleDateString('es-MX', {
                          day: 'numeric', month: 'short', year: 'numeric',
                        })}
                      </p>
                    </div>
                    <span className="font-bold text-sm text-[#4E5B3D]">+{h.puntos} pts</span>
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

        <button
          onClick={agregarAGoogleWallet}
          disabled={walletLoading}
          className="mt-5 w-full bg-[#4E5B3D] hover:bg-[#3E4A30] disabled:opacity-60 text-[#FAFAF7] font-bold py-4 rounded-2xl flex items-center justify-center gap-2 min-h-[52px] transition-colors"
        >
          {walletLoading ? (
            <span className="animate-spin rounded-full h-5 w-5 border-2 border-[#FAFAF7] border-t-transparent" />
          ) : (
            <Wallet size={20} />
          )}
          {walletLoading ? 'Generando...' : 'Agregar a Google Wallet'}
        </button>

        {walletError && (
          <p className="text-center text-red-300 text-xs mt-2">{walletError}</p>
        )}

        <p className="text-center text-[#5C3A28] text-xs mt-5 px-4">
          Presenta tu número en caja para canjear puntos
        </p>
      </div>
    </div>
  )
}
