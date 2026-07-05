import { useState, useEffect, useRef } from 'react'
import { X, Wallet, ArrowRight, Check, Coffee, Bell, BellRing, Share } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { subscribeToPush, pushSupported, isIOS, isStandalone } from '../lib/push'
import { mensajeFnError } from '../lib/fnError'

// Popup de alta al programa de fidelización: datos sencillos (nombre + teléfono) →
// se crea la tarjeta (Edge Function `cliente-registro`) → se muestra la tarjeta recién
// nacida con el botón para guardarla en Google Wallet. Apple Wallet llega después.

function soloDigitos(v) {
  return v.replace(/\D/g, '').slice(0, 10)
}

export default function RegistroModal({ onClose }) {
  const [step, setStep] = useState('form')          // 'form' | 'done'
  const [nombre, setNombre] = useState('')
  const [telefono, setTelefono] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const [cliente, setCliente] = useState(null)
  const [yaExistia, setYaExistia] = useState(false)

  const [walletLoading, setWalletLoading] = useState(false)
  const [walletError, setWalletError] = useState(null)

  // Avisos push (opt-in tras el registro).
  const [pushState, setPushState] = useState('idle')   // 'idle' | 'loading' | 'done' | 'error'
  const [pushError, setPushError] = useState(null)
  // iPhone en Safari (no instalado) no puede recibir push todavía.
  const iosSinInstalar = typeof navigator !== 'undefined' && isIOS() && !isStandalone()

  const nombreRef = useRef(null)
  const telValida = telefono.length === 10
  const formValido = nombre.trim().length >= 2 && telValida

  // No cerrar mientras hay un request en vuelo (evita perder la tarjeta recién creada).
  const ocupado = loading || walletLoading
  const cerrar = () => { if (!ocupado) onClose() }

  // Foco inicial + cerrar con Escape + bloquear scroll del fondo mientras el modal está abierto.
  useEffect(() => {
    nombreRef.current?.focus()
    const onKey = (e) => { if (e.key === 'Escape' && !ocupado) onClose() }
    window.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [onClose, ocupado])

  async function crearTarjeta(e) {
    e.preventDefault()
    if (!formValido || loading) return
    setError(null)
    setLoading(true)
    try {
      const { data, error: fnError } = await supabase.functions.invoke('cliente-registro', {
        body: { nombre: nombre.trim(), telefono },
      })
      if (fnError) throw new Error(await mensajeFnError(fnError, 'No pudimos crear tu tarjeta. Revisa tus datos.'))
      if (data?.error) throw new Error(data.error)
      if (!data?.cliente) throw new Error('No recibimos tu tarjeta. Intenta de nuevo.')
      setCliente(data.cliente)
      setYaExistia(Boolean(data.yaExistia))
      setStep('done')
    } catch (err) {
      setError(err.message || 'No pudimos crear tu tarjeta. Revisa tus datos.')
    } finally {
      setLoading(false)
    }
  }

  async function activarAvisos() {
    setPushError(null)
    setPushState('loading')
    try {
      await subscribeToPush({ telefono: cliente.telefono })
      setPushState('done')
    } catch (err) {
      setPushError(err.message || 'No se pudieron activar los avisos.')
      setPushState('error')
    }
  }

  async function agregarAGoogleWallet() {
    setWalletError(null)
    setWalletLoading(true)
    try {
      const { data, error: fnError } = await supabase.functions.invoke('wallet-google-link', {
        body: { telefono: cliente.telefono },
      })
      if (fnError) throw new Error(await mensajeFnError(fnError, 'No se pudo generar la tarjeta'))
      if (!data?.saveUrl) throw new Error('No se recibió el enlace de Google Wallet')
      window.location.href = data.saveUrl
    } catch (err) {
      setWalletError(err.message || 'No se pudo generar la tarjeta')
      setWalletLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-coffee-dark/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-6"
      onClick={cerrar}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="bg-cream w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[92vh] overflow-y-auto animate-rise"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Barra superior */}
        <div className="sticky top-0 bg-cream/95 backdrop-blur-sm flex items-center justify-between px-6 pt-5 pb-3 z-10">
          <span className="font-display text-lg font-semibold text-coffee-dark">
            {step === 'form' ? 'Únete a Soulbrew' : '¡Ya eres de la casa!'}
          </span>
          <button
            onClick={cerrar}
            disabled={ocupado}
            aria-label="Cerrar"
            className="min-h-[44px] min-w-[44px] -mr-2 flex items-center justify-center text-coffee-light hover:text-coffee-dark rounded-xl focus:outline-none focus:ring-2 focus:ring-olive disabled:opacity-40"
          >
            <X size={22} />
          </button>
        </div>

        {step === 'form' && (
          <form onSubmit={crearTarjeta} className="px-6 pb-7">
            <p className="text-coffee-light text-sm leading-relaxed mb-6">
              Crea tu tarjeta de fidelización en 10 segundos. Acumula{' '}
              <strong className="text-coffee-medium font-semibold">1 punto por cada $1</strong> y
              canjea <strong className="text-coffee-medium font-semibold">100 puntos por $10</strong>{' '}
              de descuento.
            </p>

            <label className="block mb-4">
              <span className="text-xs font-semibold uppercase tracking-wider text-coffee-light">Tu nombre</span>
              <input
                ref={nombreRef}
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                type="text"
                autoComplete="name"
                placeholder="Ana López"
                className="mt-1.5 w-full min-h-[52px] px-4 rounded-2xl bg-paper border border-line text-coffee-dark placeholder:text-coffee-light/50 focus:outline-none focus:ring-2 focus:ring-olive focus:border-olive transition"
              />
            </label>

            <label className="block mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-coffee-light">Teléfono</span>
              <input
                value={telefono}
                onChange={(e) => setTelefono(soloDigitos(e.target.value))}
                type="tel"
                inputMode="numeric"
                autoComplete="tel"
                placeholder="10 dígitos"
                className="mt-1.5 w-full min-h-[52px] px-4 rounded-2xl bg-paper border border-line text-coffee-dark placeholder:text-coffee-light/50 tracking-wide tabular-nums focus:outline-none focus:ring-2 focus:ring-olive focus:border-olive transition"
              />
            </label>
            <p className="text-xs text-coffee-light/70 mb-5 h-4">
              {telefono.length > 0 && !telValida ? `${telefono.length}/10 dígitos` : 'Lo usas para identificarte en caja.'}
            </p>

            {error && (
              <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl px-4 py-3 mb-4">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={!formValido || loading}
              className="w-full min-h-[54px] rounded-2xl bg-olive text-cream font-semibold flex items-center justify-center gap-2 disabled:opacity-40 hover:bg-[#3E4A30] transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-cream focus:ring-olive"
            >
              {loading ? (
                <span className="animate-spin rounded-full h-5 w-5 border-2 border-cream border-t-transparent" />
              ) : (
                <>Crear mi tarjeta <ArrowRight size={18} /></>
              )}
            </button>
          </form>
        )}

        {step === 'done' && cliente && (
          <div className="px-6 pb-7">
            <p className="text-coffee-light text-sm mb-5">
              {yaExistia
                ? `Ya tenías tu tarjeta, ${cliente.nombre.split(' ')[0]}. Aquí está — guárdala en tu teléfono.`
                : `Listo, ${cliente.nombre.split(' ')[0]}. Tu tarjeta ya está activa.`}
            </p>

            {/* Tarjeta recién nacida — mismo lenguaje visual que /fidelidad */}
            <div className="animate-card-in rounded-3xl bg-coffee-dark p-6 shadow-xl mb-5">
              <div className="flex items-center justify-between mb-6">
                <img src="/logo-dark.png" alt="Soulbrew" className="h-7 w-auto" />
                <span className="flex items-center gap-1 text-salvia/80 text-[11px] uppercase tracking-widest">
                  <Coffee size={12} /> Fidelidad
                </span>
              </div>
              <p className="text-salvia/70 text-xs mb-1">Puntos disponibles</p>
              <p className="font-display text-6xl font-semibold text-salvia leading-none tabular-nums mb-5">
                {cliente.puntos_acumulados ?? 0}
              </p>
              <div className="flex items-end justify-between border-t border-white/10 pt-4">
                <div>
                  <p className="text-cream font-semibold leading-tight">{cliente.nombre}</p>
                  <p className="text-salvia/60 text-sm tabular-nums">{cliente.telefono}</p>
                </div>
                <span className="text-salvia/60 text-[11px] text-right leading-tight">100 pts<br />= $10</span>
              </div>
            </div>

            <button
              onClick={agregarAGoogleWallet}
              disabled={walletLoading}
              className="w-full min-h-[54px] rounded-2xl bg-coffee-dark text-cream font-semibold flex items-center justify-center gap-2 disabled:opacity-60 hover:bg-coffee-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-cream focus:ring-olive"
            >
              {walletLoading ? (
                <span className="animate-spin rounded-full h-5 w-5 border-2 border-cream border-t-transparent" />
              ) : (
                <Wallet size={18} />
              )}
              {walletLoading ? 'Generando…' : 'Agregar a Google Wallet'}
            </button>
            {walletError && <p className="text-center text-red-600 text-xs mt-2">{walletError}</p>}

            {/* Opt-in de avisos push */}
            <div className="mt-3 rounded-2xl border border-line bg-paper p-4">
              {pushState === 'done' ? (
                <p className="flex items-center justify-center gap-2 text-olive font-semibold text-sm py-1">
                  <BellRing size={16} /> Avisos activados
                </p>
              ) : iosSinInstalar ? (
                <div className="text-center">
                  <p className="flex items-center justify-center gap-1.5 text-coffee-dark font-semibold text-sm">
                    <Bell size={15} /> Recibe avisos y promos
                  </p>
                  <p className="text-coffee-light text-xs mt-1.5 leading-snug">
                    En iPhone: toca <Share size={12} className="inline -mt-0.5" /> Compartir →
                    <strong> Agregar a inicio</strong>, ábrela desde ahí y activa los avisos.
                  </p>
                </div>
              ) : (
                <>
                  <button
                    onClick={activarAvisos}
                    disabled={pushState === 'loading' || !pushSupported()}
                    className="w-full min-h-[48px] rounded-xl bg-transparent border border-olive text-olive font-semibold flex items-center justify-center gap-2 disabled:opacity-50 hover:bg-olive/5 transition-colors"
                  >
                    {pushState === 'loading' ? (
                      <span className="animate-spin rounded-full h-4 w-4 border-2 border-olive border-t-transparent" />
                    ) : (
                      <Bell size={16} />
                    )}
                    Recibir avisos y promos
                  </button>
                  {!pushSupported() && (
                    <p className="text-coffee-light/70 text-xs text-center mt-2">
                      Tu navegador no soporta avisos.
                    </p>
                  )}
                  {pushError && <p className="text-red-600 text-xs text-center mt-2">{pushError}</p>}
                </>
              )}
            </div>

            <a
              href={`/fidelidad/${cliente.telefono}`}
              className="mt-3 w-full min-h-[48px] rounded-2xl flex items-center justify-center gap-1.5 text-olive font-semibold text-sm hover:bg-paper transition-colors"
            >
              <Check size={16} /> Ver mi tarjeta completa
            </a>

            <p className="text-center text-coffee-light/70 text-xs mt-3">
              Apple Wallet llegará pronto.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
