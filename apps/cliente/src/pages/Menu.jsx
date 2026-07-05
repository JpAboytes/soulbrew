import { useState, useEffect, useRef } from 'react'
import { Sparkles, Coffee } from 'lucide-react'
import { supabase } from '../lib/supabase'
import RegistroModal from '../components/RegistroModal'
import InstalarBanner from '../components/InstalarBanner'

// Home público: menú digital de la cafetería. Cada categoría abre con un producto
// destacado (foto grande) y sigue con renglones + miniatura. Los productos con foto
// muestran su imagen de Supabase Storage; los que no, un azulejo de marca.

const ORDEN_CATEGORIAS = ['Bebidas', 'Alimentos', 'Postres']

// Enteros sin decimales; con centavos, muéstralos (no redondear $45.50 a $46 — el POS cobra $45.50).
const PRECIO = (n) => {
  const num = Number(n) || 0
  const decimales = Number.isInteger(num) ? 0 : 2
  return num.toLocaleString('es-MX', { minimumFractionDigits: decimales, maximumFractionDigits: decimales })
}

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

// Imagen de producto con fallback: si no hay URL o falla la carga, azulejo de marca con la inicial.
function ProductoImg({ src, nombre, variant }) {
  const [error, setError] = useState(false)
  const box = variant === 'feat'
    ? 'h-48 w-full'
    : 'h-[76px] w-[76px] rounded-2xl border border-line'

  if (!src || error) {
    return (
      <div className={`${box} flex items-center justify-center bg-paper`}>
        {variant === 'feat'
          ? <Coffee size={34} className="text-coffee-light/45" />
          : <span className="font-display text-2xl text-coffee-light/55">{(nombre || '?').charAt(0).toUpperCase()}</span>}
      </div>
    )
  }

  return (
    <img
      src={src}
      alt={nombre}
      loading="lazy"
      onError={() => setError(true)}
      className={`${box} object-cover`}
    />
  )
}

export default function Menu() {
  const [estado, setEstado] = useState({ status: 'loading', grupos: [], error: null })
  const [modalAbierto, setModalAbierto] = useState(false)
  const [activa, setActiva] = useState(null)
  const seccionesRef = useRef({})

  useEffect(() => {
    let cancelado = false
    ;(async () => {
      const { data, error } = await supabase
        .from('productos')
        .select('id, nombre, descripcion, precio, categoria, imagen_url')
        .eq('activo', true)
        .order('nombre')

      if (cancelado) return
      if (error) {
        setEstado({ status: 'error', grupos: [], error: error.message })
        return
      }
      const grupos = agruparPorCategoria(data ?? [])
      setEstado({ status: 'ok', grupos, error: null })
      setActiva(grupos[0]?.[0] ?? null)
    })()
    return () => { cancelado = true }
  }, [])

  // Resaltar en la nav la categoría visible al hacer scroll.
  useEffect(() => {
    if (estado.status !== 'ok' || estado.grupos.length === 0) return
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setActiva(e.target.dataset.cat)
        })
      },
      { rootMargin: '-30% 0px -60% 0px' },
    )
    Object.values(seccionesRef.current).forEach((el) => el && obs.observe(el))
    return () => obs.disconnect()
  }, [estado])

  const irA = (cat) => {
    seccionesRef.current[cat]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="min-h-screen bg-cream text-coffee-dark">
      {/* ── Hero (espresso) ──────────────────────────────────────────────── */}
      <header
        className="rounded-b-[2.5rem] bg-coffee-dark px-6 pb-9 pt-[calc(2.5rem_+_env(safe-area-inset-top))] text-cream"
      >
        <div className="mx-auto max-w-md">
          <img src="/logo-dark.png" alt="Soulbrew" className="mb-7 h-9 w-auto animate-rise" />
          <p className="mb-3 animate-rise text-xs uppercase tracking-[0.25em] text-salvia">
            Café de especialidad
          </p>
          <h1 className="animate-rise font-display text-4xl font-semibold leading-[1.03] sm:text-[2.75rem]">
            La carta<br />de hoy.
          </h1>
          <p className="mt-4 max-w-xs animate-rise text-sm leading-relaxed text-cream/70">
            Tostado en casa, servido con calma. Esto es lo que sale de nuestra barra.
          </p>
        </div>
      </header>

      {/* ── Banner de instalación PWA ────────────────────────────────────── */}
      <div className="mx-auto max-w-md">
        <InstalarBanner />
      </div>

      {/* ── Nav de categorías (sticky) ───────────────────────────────────── */}
      {estado.status === 'ok' && estado.grupos.length > 0 && (
        <nav className="sticky top-0 z-20 mt-5 flex gap-2 overflow-x-auto border-b border-line bg-cream/85 px-[18px] py-3 backdrop-blur-md">
          <div className="mx-auto flex max-w-md flex-1 gap-2">
            {estado.grupos.map(([cat]) => (
              <button
                key={cat}
                onClick={() => irA(cat)}
                className={`whitespace-nowrap rounded-full border px-3.5 py-2 text-[13px] font-semibold transition-colors ${
                  activa === cat
                    ? 'border-olive bg-olive text-cream'
                    : 'border-transparent text-coffee-light hover:text-coffee-dark'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </nav>
      )}

      {/* ── Carta ────────────────────────────────────────────────────────── */}
      <main className="mx-auto max-w-md px-[18px] pb-40 pt-7">
        {estado.status === 'loading' && (
          <div className="flex justify-center py-20">
            <span className="h-8 w-8 animate-spin rounded-full border-4 border-olive border-t-transparent" />
          </div>
        )}

        {estado.status === 'error' && (
          <div className="py-16 text-center">
            <p className="mb-2 font-display text-xl text-coffee-dark">No pudimos cargar la carta</p>
            <p className="mb-5 text-sm text-coffee-light">Revisa tu conexión e intenta de nuevo.</p>
            <button
              onClick={() => window.location.reload()}
              className="min-h-[48px] rounded-2xl bg-olive px-6 font-semibold text-cream"
            >
              Reintentar
            </button>
          </div>
        )}

        {estado.status === 'ok' && estado.grupos.length === 0 && (
          <p className="py-16 text-center text-coffee-light">
            Estamos preparando la carta. Vuelve pronto.
          </p>
        )}

        {estado.status === 'ok' && estado.grupos.map(([categoria, items], idx) => {
          // Destacado = primer producto con foto; el resto van como renglones.
          const destacado = items.find((p) => p.imagen_url)
          const resto = destacado ? items.filter((p) => p !== destacado) : items

          return (
            <section
              key={categoria}
              data-cat={categoria}
              ref={(el) => { seccionesRef.current[categoria] = el }}
              className={`scroll-mt-16 ${idx === 0 ? '' : 'mt-4'}`}
            >
              {idx > 0 && (
                <div className="my-7 flex items-center gap-3.5 px-2">
                  <span className="h-px flex-1 bg-line" />
                  <Coffee size={16} className="text-line" />
                  <span className="h-px flex-1 bg-line" />
                </div>
              )}

              <div className="mb-4 flex items-baseline justify-between px-1">
                <h2 className="font-display text-2xl font-semibold text-coffee-dark">{categoria}</h2>
                <span className="text-[11px] uppercase tracking-[0.2em] text-coffee-light tabular-nums">
                  {String(items.length).padStart(2, '0')} · carta
                </span>
              </div>

              {/* Destacado con foto grande */}
              {destacado && (
                <article className="mb-3.5 overflow-hidden rounded-3xl border border-line bg-paper">
                  <div className="relative">
                    <ProductoImg src={destacado.imagen_url} nombre={destacado.nombre} variant="feat" />
                    <span className="absolute left-3.5 top-3.5 rounded-full bg-olive px-2.5 py-1 text-[10.5px] font-semibold uppercase tracking-wider text-cream">
                      Destacado
                    </span>
                  </div>
                  <div className="px-[18px] pb-[18px] pt-4">
                    <div className="flex items-baseline gap-3">
                      <h3 className="flex-1 font-display text-xl font-semibold text-coffee-dark">{destacado.nombre}</h3>
                      <span className="font-display text-lg font-semibold text-olive tabular-nums">${PRECIO(destacado.precio)}</span>
                    </div>
                    {destacado.descripcion && (
                      <p className="mt-1.5 text-sm leading-relaxed text-coffee-light">{destacado.descripcion}</p>
                    )}
                  </div>
                </article>
              )}

              {/* Resto: renglones con miniatura */}
              <div className="flex flex-col">
                {resto.map((p) => (
                  <div key={p.id} className="flex items-center gap-3.5 border-b border-line py-3.5 last:border-0">
                    <ProductoImg src={p.imagen_url} nombre={p.nombre} variant="thumb" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-2.5">
                        <h4 className="flex-1 font-display text-[17px] font-semibold leading-tight text-coffee-dark">{p.nombre}</h4>
                        <span className="flex-none font-semibold text-olive tabular-nums">${PRECIO(p.precio)}</span>
                      </div>
                      {p.descripcion && (
                        <p className="mt-0.5 text-[13px] leading-snug text-coffee-light">{p.descripcion}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )
        })}

        {/* ── Invitación a fidelidad ─────────────────────────────────────── */}
        {estado.status === 'ok' && (
          <section className="mt-8 rounded-3xl border border-line bg-paper p-6 text-center">
            <p className="font-display text-2xl font-semibold leading-tight text-coffee-dark">
              Toma café, gana café.
            </p>
            <p className="mb-5 mt-2 text-sm leading-relaxed text-coffee-light">
              1 punto por cada $1. Junta 100 y son $10 de descuento en tu próxima visita.
            </p>
            <button
              onClick={() => setModalAbierto(true)}
              className="inline-flex min-h-[52px] items-center gap-2 rounded-2xl bg-olive px-7 font-semibold text-cream transition-colors hover:bg-[#3E4A30] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-paper focus:ring-olive"
            >
              <Sparkles size={18} /> Crear mi tarjeta
            </button>
          </section>
        )}
      </main>

      {/* ── CTA flotante ─────────────────────────────────────────────────── */}
      <div className="pointer-events-none fixed inset-x-0 bottom-0">
        <div className="mx-auto max-w-md bg-gradient-to-t from-cream via-cream/90 to-transparent px-6 pb-[calc(1.5rem_+_env(safe-area-inset-bottom))] pt-10">
          <button
            onClick={() => setModalAbierto(true)}
            className="pointer-events-auto flex min-h-[56px] w-full items-center justify-center gap-2 rounded-2xl bg-coffee-dark font-semibold text-cream shadow-xl shadow-coffee-dark/20 transition-colors hover:bg-coffee-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-cream focus:ring-olive"
          >
            <Sparkles size={18} className="text-salvia" /> Únete a fidelidad
          </button>
        </div>
      </div>

      {modalAbierto && <RegistroModal onClose={() => setModalAbierto(false)} />}
    </div>
  )
}
