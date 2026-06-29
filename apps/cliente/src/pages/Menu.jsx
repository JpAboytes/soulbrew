import { useState, useEffect } from 'react'
import { Sparkles } from 'lucide-react'
import { supabase } from '../lib/supabase'
import RegistroModal from '../components/RegistroModal'

// Página principal pública (home): la carta de la cafetería, tratada como una carta
// impresa de café de especialidad. Sin fotos (los productos no tienen imagen): la
// composición y la tipografía cargan el peso. CTA flotante para unirse a fidelidad.

const ORDEN_CATEGORIAS = ['Bebidas', 'Alimentos', 'Postres']

const PRECIO = (n) =>
  Number(n).toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 })

function agruparPorCategoria(productos) {
  const grupos = {}
  for (const p of productos) {
    ;(grupos[p.categoria] ??= []).push(p)
  }
  const claves = Object.keys(grupos).sort((a, b) => {
    const ia = ORDEN_CATEGORIAS.indexOf(a)
    const ib = ORDEN_CATEGORIAS.indexOf(b)
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib)
  })
  return claves.map((cat) => [cat, grupos[cat].sort((a, b) => a.precio - b.precio)])
}

export default function Menu() {
  const [estado, setEstado] = useState({ status: 'loading', grupos: [], error: null })
  const [modalAbierto, setModalAbierto] = useState(false)

  useEffect(() => {
    let cancelado = false
    ;(async () => {
      const { data, error } = await supabase
        .from('productos')
        .select('id, nombre, descripcion, precio, categoria')
        .eq('activo', true)
        .order('nombre')

      if (cancelado) return
      if (error) {
        setEstado({ status: 'error', grupos: [], error: error.message })
        return
      }
      setEstado({ status: 'ok', grupos: agruparPorCategoria(data ?? []), error: null })
    })()
    return () => { cancelado = true }
  }, [])

  return (
    <div className="min-h-screen bg-cream text-coffee-dark">
      {/* ── Hero (espresso): la tesis de marca ───────────────────────────── */}
      <header className="bg-coffee-dark text-cream rounded-b-[2.5rem] px-6 pt-12 pb-10">
        <div className="max-w-md mx-auto">
          <img src="/logo-dark.png" alt="Soulbrew" className="h-9 w-auto mb-8 animate-rise" />
          <p className="text-salvia text-xs uppercase tracking-[0.25em] mb-3 animate-rise">
            Café de especialidad
          </p>
          <h1 className="font-display text-4xl sm:text-5xl font-semibold leading-[1.05] animate-rise">
            Cada taza, un<br />pequeño ritual.
          </h1>
          <p className="text-cream/70 text-sm mt-4 leading-relaxed max-w-xs animate-rise">
            Tostado en casa, servido con calma. Esta es la carta de hoy.
          </p>
        </div>
      </header>

      {/* ── Carta ────────────────────────────────────────────────────────── */}
      <main className="max-w-md mx-auto px-6 pt-10 pb-40">
        {estado.status === 'loading' && (
          <div className="flex justify-center py-20">
            <span className="animate-spin rounded-full h-8 w-8 border-4 border-olive border-t-transparent" />
          </div>
        )}

        {estado.status === 'error' && (
          <div className="text-center py-16">
            <p className="font-display text-xl text-coffee-dark mb-2">No pudimos cargar la carta</p>
            <p className="text-coffee-light text-sm mb-5">{estado.error}</p>
            <button
              onClick={() => window.location.reload()}
              className="min-h-[48px] px-6 rounded-2xl bg-olive text-cream font-semibold"
            >
              Reintentar
            </button>
          </div>
        )}

        {estado.status === 'ok' && estado.grupos.length === 0 && (
          <p className="text-center text-coffee-light py-16">
            Estamos preparando la carta. Vuelve pronto.
          </p>
        )}

        {estado.status === 'ok' && estado.grupos.map(([categoria, items], idx) => (
          <section key={categoria} className={idx === 0 ? '' : 'mt-12'}>
            {/* Eyebrow de sección */}
            <div className="flex items-baseline justify-between mb-5">
              <h2 className="font-display text-2xl font-semibold text-coffee-dark">{categoria}</h2>
              <span className="text-coffee-light/60 text-xs uppercase tracking-widest tabular-nums">
                {String(items.length).padStart(2, '0')}
              </span>
            </div>

            <ul>
              {items.map((p) => (
                <li key={p.id} className="py-4 border-b border-line last:border-0">
                  {/* Renglón con leader dots, como una carta impresa */}
                  <div className="flex items-baseline gap-2">
                    <span className="font-display text-lg text-coffee-dark font-medium">{p.nombre}</span>
                    <span className="flex-1 border-b border-dotted border-line translate-y-[-3px]" />
                    <span className="font-display text-lg text-olive font-semibold tabular-nums shrink-0">
                      ${PRECIO(p.precio)}
                    </span>
                  </div>
                  {p.descripcion && (
                    <p className="text-coffee-light text-sm mt-1 pr-12 leading-snug">{p.descripcion}</p>
                  )}
                </li>
              ))}
            </ul>
          </section>
        ))}

        {/* ── Invitación a fidelidad (lead-in del elemento firma) ─────────── */}
        {estado.status === 'ok' && (
          <section className="mt-14 rounded-3xl bg-paper border border-line p-6 text-center">
            <p className="font-display text-2xl font-semibold text-coffee-dark leading-tight">
              Toma café, gana café.
            </p>
            <p className="text-coffee-light text-sm mt-2 mb-5 leading-relaxed">
              1 punto por cada $1. Junta 100 y son $10 de descuento en tu próxima visita.
            </p>
            <button
              onClick={() => setModalAbierto(true)}
              className="min-h-[52px] px-7 rounded-2xl bg-olive text-cream font-semibold inline-flex items-center gap-2 hover:bg-[#3E4A30] transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-paper focus:ring-olive"
            >
              <Sparkles size={18} /> Crear mi tarjeta
            </button>
          </section>
        )}
      </main>

      {/* ── CTA flotante (siempre alcanzable en móvil) ───────────────────── */}
      <div className="fixed bottom-0 inset-x-0 pointer-events-none">
        <div className="max-w-md mx-auto px-6 pb-6 pt-10 bg-gradient-to-t from-cream via-cream/90 to-transparent">
          <button
            onClick={() => setModalAbierto(true)}
            className="pointer-events-auto w-full min-h-[56px] rounded-2xl bg-coffee-dark text-cream font-semibold shadow-xl shadow-coffee-dark/20 flex items-center justify-center gap-2 hover:bg-coffee-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-cream focus:ring-olive"
          >
            <Sparkles size={18} className="text-salvia" /> Únete a fidelidad
          </button>
        </div>
      </div>

      {modalAbierto && <RegistroModal onClose={() => setModalAbierto(false)} />}
    </div>
  )
}
