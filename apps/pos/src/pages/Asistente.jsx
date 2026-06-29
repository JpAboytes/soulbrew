import { useState, useRef, useEffect, useCallback } from 'react'
import { Send, Sparkles, AlertTriangle, RotateCcw } from 'lucide-react'
import { supabase } from '../lib/supabase'
import Markdown from '../components/Markdown'

const WEBHOOK_URL = import.meta.env.VITE_N8N_WEBHOOK_URL

// Preguntas sugeridas para arrancar la conversación
const SUGERENCIAS = [
  '¿Cuánto vendí esta semana vs la anterior?',
  '¿Cuáles son mis productos más rentables?',
  '¿Qué productos se venden sin tener receta?',
  '¿Qué insumos están por agotarse?',
  '¿Quiénes son mis mejores clientes?',
  '¿A qué horas vendo más?',
]

// sessionId estable por pestaña — da continuidad a la memoria del agente en n8n
function getSessionId() {
  let id = sessionStorage.getItem('asistente_session')
  if (!id) {
    id = (crypto.randomUUID?.() ?? `sess-${Date.now()}-${Math.random().toString(36).slice(2)}`)
    sessionStorage.setItem('asistente_session', id)
  }
  return id
}

// Extrae el texto de respuesta sin importar la forma exacta que devuelva n8n
function extraerRespuesta(data) {
  if (typeof data === 'string') return data
  if (!data || typeof data !== 'object') return 'Sin respuesta.'
  return (
    data.reply ?? data.output ?? data.text ?? data.message ?? data.answer ??
    (Array.isArray(data) ? extraerRespuesta(data[0]) : JSON.stringify(data))
  )
}

export default function Asistente() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const sessionId = useRef(getSessionId())
  const scrollRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, loading])

  const enviar = useCallback(async (texto) => {
    const mensaje = (texto ?? input).trim()
    if (!mensaje || loading) return

    if (!WEBHOOK_URL) {
      setMessages(m => [...m,
        { role: 'user', text: mensaje },
        { role: 'error', text: 'Falta configurar VITE_N8N_WEBHOOK_URL en .env.local' },
      ])
      setInput('')
      return
    }

    setMessages(m => [...m, { role: 'user', text: mensaje }])
    setInput('')
    setLoading(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({
          message: mensaje,
          sessionId: sessionId.current,
          userEmail: session?.user?.email ?? null,
        }),
      })

      if (!res.ok) throw new Error(`El asistente respondió ${res.status}`)

      const raw = await res.text()
      let data
      try { data = JSON.parse(raw) } catch { data = raw }

      setMessages(m => [...m, { role: 'assistant', text: extraerRespuesta(data) }])
    } catch (err) {
      setMessages(m => [...m, { role: 'error', text: err.message || 'No pude contactar al asistente.' }])
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }, [input, loading])

  function nuevaConversacion() {
    setMessages([])
    sessionStorage.removeItem('asistente_session')
    sessionId.current = getSessionId()
    inputRef.current?.focus()
  }

  return (
    <div className="flex flex-col h-screen bg-[#FAFAF7]">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white shrink-0">
        <div className="flex items-center gap-3">
          <div className="bg-[#4E5B3D] p-2 rounded-xl">
            <Sparkles size={20} className="text-[#FAFAF7]" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-[#42241A]">Asistente</h1>
            <p className="text-xs text-[#7C5A43]">Pregúntale sobre tus ventas, productos e inventario</p>
          </div>
        </div>
        {messages.length > 0 && (
          <button
            onClick={nuevaConversacion}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-[#42241A] min-h-[44px] px-3 rounded-xl hover:bg-gray-100 transition-colors"
          >
            <RotateCcw size={16} />
            Nueva
          </button>
        )}
      </div>

      {/* Mensajes */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 md:px-6 py-6">
        <div className="max-w-2xl mx-auto space-y-4">
          {messages.length === 0 && (
            <div className="text-center pt-8">
              <div className="bg-[#4E5B3D]/15 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Sparkles size={28} className="text-[#4E5B3D]" />
              </div>
              <h2 className="text-xl font-bold text-[#42241A]">¿En qué te ayudo hoy?</h2>
              <p className="text-sm text-gray-500 mt-1 mb-6">
                Analizo tus datos de Soulbrew y te respondo en lenguaje natural.
              </p>
              <div className="grid sm:grid-cols-2 gap-2 max-w-xl mx-auto">
                {SUGERENCIAS.map(s => (
                  <button
                    key={s}
                    onClick={() => enviar(s)}
                    className="text-left text-sm bg-white border border-gray-200 hover:border-[#4E5B3D] rounded-2xl px-4 py-3 transition-colors text-[#42241A] min-h-[52px]"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {m.role === 'error' ? (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-2xl px-4 py-3 text-sm max-w-[85%]">
                  <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                  <span>{m.text}</span>
                </div>
              ) : (
                <div
                  className={`rounded-2xl px-4 py-3 text-sm max-w-[85%] ${
                    m.role === 'user'
                      ? 'bg-[#42241A] text-white whitespace-pre-wrap leading-relaxed'
                      : 'bg-white border border-gray-100 shadow-sm'
                  }`}
                >
                  {m.role === 'user' ? m.text : <Markdown>{m.text}</Markdown>}
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-white border border-gray-100 rounded-2xl px-4 py-3 shadow-sm flex items-center gap-1.5">
                <span className="w-2 h-2 bg-[#4E5B3D] rounded-full animate-bounce [animation-delay:-0.3s]" />
                <span className="w-2 h-2 bg-[#4E5B3D] rounded-full animate-bounce [animation-delay:-0.15s]" />
                <span className="w-2 h-2 bg-[#4E5B3D] rounded-full animate-bounce" />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-gray-100 bg-white px-4 md:px-6 py-4 shrink-0">
        <form
          onSubmit={e => { e.preventDefault(); enviar() }}
          className="max-w-2xl mx-auto flex gap-2 items-end"
        >
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar() }
            }}
            placeholder="Escribe tu pregunta..."
            rows={1}
            className="flex-1 border border-gray-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#4E5B3D] resize-none max-h-32 min-h-[52px]"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="bg-[#4E5B3D] hover:bg-[#3E4A30] disabled:opacity-50 text-[#FAFAF7] font-bold rounded-2xl w-[52px] h-[52px] flex items-center justify-center shrink-0 transition-colors"
          >
            <Send size={20} />
          </button>
        </form>
      </div>
    </div>
  )
}
