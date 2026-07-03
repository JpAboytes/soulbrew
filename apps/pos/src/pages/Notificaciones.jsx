import { useState, useEffect, useCallback } from 'react'
import { Bell, Send, Users, User, Megaphone } from 'lucide-react'
import { supabase } from '../lib/supabase'
import Toast from '../components/Toast'

// Panel para enviar notificaciones Web Push a los clientes (a todos o a uno por teléfono).
// Envía vía la Edge Function `push-send`, que autoriza con la sesión del cajero (JWT).

const soloDigitos = (v) => v.replace(/\D/g, '').slice(0, 10)

export default function Notificaciones() {
  const [audiencia, setAudiencia] = useState('todos')   // 'todos' | 'cliente'
  const [telefono, setTelefono] = useState('')
  const [titulo, setTitulo] = useState('Soulbrew')
  const [mensaje, setMensaje] = useState('')
  const [enlace, setEnlace] = useState('/')
  const [enviando, setEnviando] = useState(false)
  const [suscriptores, setSuscriptores] = useState(null)
  const [toast, setToast] = useState(null)

  const cargarConteo = useCallback(async () => {
    const { count } = await supabase
      .from('push_subscriptions')
      .select('id', { count: 'exact', head: true })
    setSuscriptores(count ?? 0)
  }, [])

  useEffect(() => { cargarConteo() }, [cargarConteo])

  const telValido = telefono.length === 10
  const puedeEnviar =
    mensaje.trim().length > 0 && !enviando && (audiencia === 'todos' || telValido)

  async function enviar() {
    if (!puedeEnviar) return
    setEnviando(true)
    try {
      const body = {
        title: titulo.trim() || 'Soulbrew',
        body: mensaje.trim(),
        url: enlace.trim() || '/',
      }
      if (audiencia === 'cliente') body.telefono = telefono

      const { data, error } = await supabase.functions.invoke('push-send', { body })

      if (error) {
        let msg = error.message
        try { const j = await error.context.json(); if (j?.error) msg = j.error } catch { /* noop */ }
        throw new Error(msg)
      }
      if (data?.error) throw new Error(data.error)

      const sent = data?.sent ?? 0
      if (sent === 0) {
        setToast({ type: 'error', text: 'No hay dispositivos suscritos para ese destino.' })
      } else {
        setToast({ type: 'success', text: `Enviado a ${sent} dispositivo${sent !== 1 ? 's' : ''}.` })
        setMensaje('')
      }
      cargarConteo()
    } catch (err) {
      setToast({ type: 'error', text: err.message || 'No se pudo enviar.' })
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="p-6 sm:p-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-1">
        <div className="w-11 h-11 rounded-2xl bg-[#4E5B3D]/15 flex items-center justify-center">
          <Bell size={22} className="text-[#4E5B3D]" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[#42241A]">Notificaciones</h1>
          <p className="text-sm text-[#7C5A43]">
            {suscriptores === null
              ? 'Cargando suscriptores…'
              : `${suscriptores} dispositivo${suscriptores !== 1 ? 's' : ''} suscrito${suscriptores !== 1 ? 's' : ''}`}
          </p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mt-6">
        {/* Compositor */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 space-y-5">
          {/* Audiencia */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-[#7C5A43]">Destinatarios</label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <button
                onClick={() => setAudiencia('todos')}
                className={`min-h-[48px] rounded-xl font-semibold flex items-center justify-center gap-2 border transition-colors ${
                  audiencia === 'todos'
                    ? 'bg-[#4E5B3D] text-white border-[#4E5B3D]'
                    : 'bg-white text-[#42241A] border-gray-200 hover:border-[#4E5B3D]'
                }`}
              >
                <Users size={18} /> Todos
              </button>
              <button
                onClick={() => setAudiencia('cliente')}
                className={`min-h-[48px] rounded-xl font-semibold flex items-center justify-center gap-2 border transition-colors ${
                  audiencia === 'cliente'
                    ? 'bg-[#4E5B3D] text-white border-[#4E5B3D]'
                    : 'bg-white text-[#42241A] border-gray-200 hover:border-[#4E5B3D]'
                }`}
              >
                <User size={18} /> Un cliente
              </button>
            </div>
            {audiencia === 'cliente' && (
              <input
                value={telefono}
                onChange={(e) => setTelefono(soloDigitos(e.target.value))}
                type="tel"
                inputMode="numeric"
                placeholder="Teléfono (10 dígitos)"
                className="mt-2 w-full min-h-[48px] px-4 rounded-xl border border-gray-200 text-[#42241A] tabular-nums focus:outline-none focus:ring-2 focus:ring-[#4E5B3D] focus:border-[#4E5B3D]"
              />
            )}
          </div>

          {/* Título */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-[#7C5A43]">Título</label>
            <input
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              maxLength={50}
              className="mt-2 w-full min-h-[48px] px-4 rounded-xl border border-gray-200 text-[#42241A] focus:outline-none focus:ring-2 focus:ring-[#4E5B3D] focus:border-[#4E5B3D]"
            />
          </div>

          {/* Mensaje */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-[#7C5A43]">Mensaje</label>
            <textarea
              value={mensaje}
              onChange={(e) => setMensaje(e.target.value)}
              maxLength={140}
              rows={3}
              placeholder="Ej. ¡Hoy 2x1 en lattes hasta las 6pm! ☕"
              className="mt-2 w-full px-4 py-3 rounded-xl border border-gray-200 text-[#42241A] resize-none focus:outline-none focus:ring-2 focus:ring-[#4E5B3D] focus:border-[#4E5B3D]"
            />
            <p className="text-xs text-gray-400 text-right">{mensaje.length}/140</p>
          </div>

          {/* Enlace */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-[#7C5A43]">Al tocar, abre</label>
            <input
              value={enlace}
              onChange={(e) => setEnlace(e.target.value)}
              placeholder="/"
              className="mt-2 w-full min-h-[48px] px-4 rounded-xl border border-gray-200 text-[#42241A] focus:outline-none focus:ring-2 focus:ring-[#4E5B3D] focus:border-[#4E5B3D]"
            />
            <p className="text-xs text-gray-400 mt-1">Ruta del cliente. Ej. <code>/</code> (menú) o <code>/fidelidad/6681234567</code>.</p>
          </div>

          <button
            onClick={enviar}
            disabled={!puedeEnviar}
            className="w-full min-h-[52px] rounded-2xl bg-[#4E5B3D] text-white font-bold flex items-center justify-center gap-2 disabled:opacity-40 hover:bg-[#3E4A30] transition-colors"
          >
            {enviando ? (
              <span className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
            ) : (
              <Send size={18} />
            )}
            {enviando ? 'Enviando…' : audiencia === 'todos' ? 'Enviar a todos' : 'Enviar al cliente'}
          </button>
        </div>

        {/* Vista previa */}
        <div className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#7C5A43]">Vista previa</p>
          <div className="bg-[#F4EFE4] rounded-3xl p-4 border border-[#E2D9C8]">
            <div className="bg-white rounded-2xl p-4 shadow-sm flex gap-3">
              <img src="/favicon.png" alt="" className="w-10 h-10 rounded-lg shrink-0" />
              <div className="min-w-0">
                <p className="font-semibold text-[#42241A] text-sm truncate">{titulo || 'Soulbrew'}</p>
                <p className="text-sm text-gray-600 break-words">
                  {mensaje || 'Tu mensaje aparecerá aquí.'}
                </p>
                <p className="text-[11px] text-gray-400 mt-1">soulbrew-cliente.vercel.app</p>
              </div>
            </div>
          </div>

          <div className="flex items-start gap-2 text-xs text-[#7C5A43] bg-[#4E5B3D]/5 rounded-2xl p-3">
            <Megaphone size={15} className="shrink-0 mt-0.5 text-[#4E5B3D]" />
            <span>
              Solo reciben quienes activaron avisos en la app. En iPhone deben tener la app
              agregada a la pantalla de inicio.
            </span>
          </div>
        </div>
      </div>

      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </div>
  )
}
