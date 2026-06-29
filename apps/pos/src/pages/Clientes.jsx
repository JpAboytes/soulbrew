import { useState, useEffect, useCallback } from 'react'
import { Plus, X, Search, Edit2, Star, ChevronDown, Minus, QrCode } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { supabase } from '../lib/supabase'
import Toast from '../components/Toast'

// Base pública para los links de la tarjeta de fidelización (QR). En prod cae al origin
// del sitio; en dev conviene definir VITE_PUBLIC_URL con la URL de producción.
const PUBLIC_URL = import.meta.env.VITE_PUBLIC_URL || (typeof window !== 'undefined' ? window.location.origin : '')

// ─── Ajuste manual de puntos ──────────────────────────────────────────────────

function AjusteModal({ cliente, onClose, onAjusted }) {
  const [tipo, setTipo] = useState('agregar')
  const [puntos, setPuntos] = useState('')
  const [concepto, setConcepto] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    const cantidad = parseInt(puntos)
    if (!cantidad || cantidad <= 0) return
    const delta = tipo === 'agregar' ? cantidad : -cantidad
    const nuevos = Math.max(0, cliente.puntos_acumulados + delta)
    setLoading(true)
    const [{ error: e1 }, { error: e2 }] = await Promise.all([
      supabase.from('clientes').update({ puntos_acumulados: nuevos }).eq('id', cliente.id),
      supabase.from('puntos_historial').insert({
        cliente_id: cliente.id,
        puntos: delta,
        concepto: concepto.trim() || (tipo === 'agregar' ? 'bono' : 'ajuste'),
      }),
    ])
    setLoading(false)
    if (!e1 && !e2) onAjusted(nuevos)
    else alert('Error al ajustar puntos')
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl">
        <div className="flex justify-between items-center mb-5">
          <h3 className="text-lg font-bold text-[#42241A]">Ajustar Puntos</h3>
          <button onClick={onClose} className="min-h-[44px] min-w-[44px] flex items-center justify-center text-gray-400">
            <X size={22} />
          </button>
        </div>

        <div className="bg-[#4E5B3D]/10 rounded-xl px-4 py-3 mb-5 text-center">
          <p className="text-sm text-[#7C5A43]">Puntos actuales</p>
          <p className="text-3xl font-bold text-[#42241A]">{cliente.puntos_acumulados}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            {['agregar', 'quitar'].map(t => (
              <button
                key={t}
                type="button"
                onClick={() => setTipo(t)}
                className={`py-3 rounded-xl font-semibold text-sm capitalize transition-colors min-h-[48px] ${
                  tipo === t ? 'bg-[#42241A] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {t === 'agregar' ? '+ Agregar' : '− Quitar'}
              </button>
            ))}
          </div>

          <div>
            <label className="block text-sm font-medium text-[#42241A] mb-1">Cantidad de puntos *</label>
            <input
              type="number" min="1"
              value={puntos}
              onChange={e => setPuntos(e.target.value)}
              required placeholder="Ej. 50"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#4E5B3D] text-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#42241A] mb-1">Concepto (opcional)</label>
            <input
              value={concepto}
              onChange={e => setConcepto(e.target.value)}
              placeholder="Ej. Corrección, Bono cumpleaños..."
              className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#4E5B3D]"
            />
          </div>

          <button
            type="submit" disabled={loading}
            className="w-full bg-[#4E5B3D] hover:bg-[#3E4A30] disabled:opacity-60 text-[#FAFAF7] font-bold py-3.5 rounded-xl transition-colors min-h-[52px]"
          >
            {loading ? 'Guardando...' : 'Confirmar ajuste'}
          </button>
        </form>
      </div>
    </div>
  )
}

// ─── Modal detalle de cliente ─────────────────────────────────────────────────

function ClienteModal({ cliente: clienteInicial, onClose, onUpdated }) {
  const [cliente, setCliente] = useState(clienteInicial)
  const [editando, setEditando] = useState(false)
  const [form, setForm] = useState({
    nombre: clienteInicial.nombre,
    telefono: clienteInicial.telefono || '',
    email: clienteInicial.email || '',
  })
  const [saving, setSaving] = useState(false)
  const [historial, setHistorial] = useState([])
  const [historialLoading, setHistorialLoading] = useState(true)
  const [totalGastado, setTotalGastado] = useState(null)
  const [showAjuste, setShowAjuste] = useState(false)
  const [showQR, setShowQR] = useState(false)

  useEffect(() => {
    fetchHistorial()
    fetchTotalGastado()
  }, [])

  async function fetchHistorial() {
    const { data } = await supabase
      .from('puntos_historial')
      .select('*')
      .eq('cliente_id', cliente.id)
      .order('created_at', { ascending: false })
      .limit(20)
    if (data) setHistorial(data)
    setHistorialLoading(false)
  }

  async function fetchTotalGastado() {
    const { data } = await supabase
      .from('ventas')
      .select('total')
      .eq('cliente_id', cliente.id)
    if (data) setTotalGastado(data.reduce((s, v) => s + Number(v.total), 0))
  }

  async function saveEdit() {
    setSaving(true)
    const { error } = await supabase.from('clientes').update({
      nombre: form.nombre,
      telefono: form.telefono || null,
      email: form.email || null,
    }).eq('id', cliente.id)
    setSaving(false)
    if (!error) {
      setCliente(c => ({ ...c, ...form }))
      setEditando(false)
      onUpdated()
    } else alert(error.message)
  }

  const canjeable = cliente.puntos_acumulados >= 100

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 flex items-center justify-center p-4 md:p-6">
      <div className="bg-white rounded-3xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-[#4E5B3D]/20 flex items-center justify-center shrink-0">
            <span className="text-2xl font-bold text-[#4E5B3D]">
              {cliente.nombre.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            {editando ? (
              <div className="space-y-2">
                <input
                  value={form.nombre}
                  onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-base font-bold focus:outline-none focus:ring-2 focus:ring-[#4E5B3D]"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="tel"
                    value={form.telefono}
                    onChange={e => setForm(f => ({ ...f, telefono: e.target.value.replace(/\D/g, '') }))}
                    placeholder="Teléfono"
                    className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4E5B3D]"
                  />
                  <input
                    type="email"
                    value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    placeholder="Email"
                    className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4E5B3D]"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={saveEdit} disabled={saving}
                    className="flex-1 bg-[#4E5B3D] text-[#FAFAF7] font-semibold py-2 rounded-xl text-sm min-h-[40px]"
                  >
                    {saving ? 'Guardando...' : 'Guardar'}
                  </button>
                  <button onClick={() => setEditando(false)} className="px-4 py-2 text-gray-500 text-sm min-h-[40px]">
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-[#42241A] truncate">{cliente.nombre}</h2>
                  {canjeable && (
                    <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-0.5 rounded-full shrink-0">
                      Canjeable
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-500">{cliente.telefono || 'Sin teléfono'}</p>
                {cliente.email && <p className="text-xs text-gray-400">{cliente.email}</p>}
              </>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {!editando && (
              <button
                onClick={() => setEditando(true)}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center text-gray-400 hover:text-[#42241A] transition-colors"
              >
                <Edit2 size={18} />
              </button>
            )}
            <button
              onClick={onClose}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={22} />
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 px-6 py-4 border-b border-gray-100">
          <div className="text-center">
            <p className="text-2xl font-bold text-[#4E5B3D]">{cliente.puntos_acumulados}</p>
            <p className="text-xs text-gray-500 mt-0.5">puntos</p>
          </div>
          <div className="text-center border-x border-gray-100">
            <p className="text-2xl font-bold text-[#42241A]">{cliente.visitas}</p>
            <p className="text-xs text-gray-500 mt-0.5">visitas</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-[#42241A]">
              {totalGastado !== null ? `$${totalGastado.toFixed(0)}` : '—'}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">gastado</p>
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 py-3 border-b border-gray-100 space-y-1">
          <button
            onClick={() => setShowAjuste(true)}
            className="flex items-center gap-2 text-sm font-medium text-[#4E5B3D] hover:text-[#3E4A30] min-h-[44px] transition-colors"
          >
            <Star size={16} />
            Ajustar puntos manualmente
          </button>

          {cliente.telefono && (
            <button
              onClick={() => setShowQR(v => !v)}
              className="flex items-center gap-2 text-sm font-medium text-[#42241A] hover:text-[#5C3A28] min-h-[44px] transition-colors"
            >
              <QrCode size={16} />
              {showQR ? 'Ocultar tarjeta de fidelización' : 'Mostrar tarjeta de fidelización (QR)'}
            </button>
          )}

          {showQR && cliente.telefono && (
            <div className="flex flex-col items-center gap-2 py-3">
              <div className="bg-white p-3 rounded-2xl border border-gray-100">
                <QRCodeSVG value={`${PUBLIC_URL}/fidelidad/${cliente.telefono}`} size={180} />
              </div>
              <p className="text-xs text-gray-500 text-center max-w-[240px]">
                El cliente escanea este QR para abrir su tarjeta y agregarla a Google Wallet.
              </p>
              <a
                href={`${PUBLIC_URL}/fidelidad/${cliente.telefono}`}
                target="_blank" rel="noopener noreferrer"
                className="text-xs text-[#4E5B3D] font-medium underline break-all text-center"
              >
                {`${PUBLIC_URL}/fidelidad/${cliente.telefono}`}
              </a>
            </div>
          )}
        </div>

        {/* Historial */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <h3 className="text-sm font-bold text-[#42241A] mb-3">Historial de movimientos</h3>
          {historialLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="animate-pulse h-10 bg-gray-100 rounded-xl" />
              ))}
            </div>
          ) : historial.length === 0 ? (
            <p className="text-sm text-gray-400 italic text-center py-8">Sin movimientos registrados</p>
          ) : (
            <div className="space-y-0 divide-y divide-gray-50">
              {historial.map(h => (
                <div key={h.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium text-[#42241A] capitalize">{h.concepto}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(h.created_at).toLocaleDateString('es-MX', {
                        day: 'numeric', month: 'short', year: 'numeric',
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </p>
                  </div>
                  <span className={`font-bold text-sm px-2 py-1 rounded-lg ${
                    h.puntos > 0
                      ? 'text-[#4E5B3D] bg-[#4E5B3D]/10'
                      : 'text-red-600 bg-red-50'
                  }`}>
                    {h.puntos > 0 ? '+' : ''}{h.puntos}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showAjuste && (
        <AjusteModal
          cliente={cliente}
          onClose={() => setShowAjuste(false)}
          onAjusted={(nuevos) => {
            setCliente(c => ({ ...c, puntos_acumulados: nuevos }))
            setShowAjuste(false)
            fetchHistorial()
            onUpdated()
          }}
        />
      )}
    </div>
  )
}

// ─── Modal nuevo cliente ──────────────────────────────────────────────────────

function NuevoClienteModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ nombre: '', telefono: '', email: '' })
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    const { data, error } = await supabase.from('clientes').insert({
      nombre: form.nombre,
      telefono: form.telefono || null,
      email: form.email || null,
    }).select().single()
    setLoading(false)
    if (!error) onCreated(data)
    else alert(error.message)
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 flex items-center justify-center p-6">
      <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl">
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-xl font-bold text-[#42241A]">Nuevo Cliente</h2>
          <button onClick={onClose} className="min-h-[44px] min-w-[44px] flex items-center justify-center text-gray-400">
            <X size={22} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#42241A] mb-1">Nombre *</label>
            <input
              value={form.nombre}
              onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
              required placeholder="Nombre completo"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#4E5B3D]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#42241A] mb-1">Teléfono</label>
            <input
              type="tel"
              value={form.telefono}
              onChange={e => setForm(f => ({ ...f, telefono: e.target.value.replace(/\D/g, '') }))}
              placeholder="10 dígitos"
              maxLength={10}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#4E5B3D]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#42241A] mb-1">Email (opcional)</label>
            <input
              type="email"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              placeholder="correo@ejemplo.com"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#4E5B3D]"
            />
          </div>
          <button
            type="submit" disabled={loading}
            className="w-full bg-[#4E5B3D] hover:bg-[#3E4A30] disabled:opacity-60 text-[#FAFAF7] font-bold py-4 rounded-xl transition-colors min-h-[52px]"
          >
            {loading ? 'Registrando...' : 'Registrar Cliente'}
          </button>
        </form>
      </div>
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────

const SORT_OPTIONS = [
  { value: 'recientes', label: 'Más recientes' },
  { value: 'puntos', label: 'Más puntos' },
  { value: 'visitas', label: 'Más visitas' },
]

export default function Clientes() {
  const [clientes, setClientes] = useState([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [sortBy, setSortBy] = useState('recientes')
  const [selectedCliente, setSelectedCliente] = useState(null)
  const [showNuevo, setShowNuevo] = useState(false)
  const [toast, setToast] = useState(null)

  const fetchClientes = useCallback(async () => {
    const { data } = await supabase.from('clientes').select('*').order('created_at', { ascending: false })
    if (data) setClientes(data)
    setLoading(false)
  }, [])

  useEffect(() => { fetchClientes() }, [fetchClientes])

  const filtered = clientes
    .filter(c =>
      c.nombre.toLowerCase().includes(query.toLowerCase()) ||
      (c.telefono && c.telefono.includes(query))
    )
    .sort((a, b) => {
      if (sortBy === 'puntos') return b.puntos_acumulados - a.puntos_acumulados
      if (sortBy === 'visitas') return b.visitas - a.visitas
      return new Date(b.created_at) - new Date(a.created_at)
    })

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#42241A]">Clientes</h1>
          <p className="text-sm text-gray-500 mt-0.5">{clientes.length} registrados</p>
        </div>
        <button
          onClick={() => setShowNuevo(true)}
          className="flex items-center gap-2 bg-[#42241A] hover:bg-[#5C3A28] text-white font-semibold px-5 py-3 rounded-xl transition-colors min-h-[48px]"
        >
          <Plus size={20} />
          Nuevo Cliente
        </button>
      </div>

      {/* Search + sort */}
      <div className="flex gap-3 mb-6">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Buscar por nombre o teléfono..."
            className="w-full border border-gray-200 rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#4E5B3D] bg-white"
          />
        </div>
        <div className="relative">
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
            className="appearance-none border border-gray-200 rounded-xl px-4 pr-10 py-3 focus:outline-none focus:ring-2 focus:ring-[#4E5B3D] bg-white text-sm font-medium text-[#42241A] min-h-[48px]"
          >
            {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* Client list */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#4E5B3D] border-t-transparent" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-lg">{query ? 'Sin resultados' : 'No hay clientes registrados'}</p>
          <p className="text-sm mt-1">
            {query ? 'Intenta con otro término' : 'Regístralos desde el punto de venta o aquí'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(cliente => {
            const canjeable = cliente.puntos_acumulados >= 100
            return (
              <button
                key={cliente.id}
                onClick={() => setSelectedCliente(cliente)}
                className="w-full bg-white rounded-2xl p-4 shadow-sm border-2 border-transparent hover:border-[#4E5B3D] transition-all text-left min-h-[80px] flex items-center gap-4"
              >
                <div className="w-12 h-12 rounded-full bg-[#4E5B3D]/20 flex items-center justify-center shrink-0">
                  <span className="text-lg font-bold text-[#4E5B3D]">
                    {cliente.nombre.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-[#42241A] truncate">{cliente.nombre}</p>
                    {canjeable && (
                      <span className="shrink-0 bg-green-100 text-green-700 text-xs font-bold px-2 py-0.5 rounded-full">
                        Canjeable
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500">{cliente.telefono || 'Sin teléfono'}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Desde {new Date(cliente.created_at).toLocaleDateString('es-MX', { month: 'short', year: 'numeric' })}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xl font-bold text-[#4E5B3D]">{cliente.puntos_acumulados}</p>
                  <p className="text-xs text-gray-400">puntos</p>
                  <p className="text-xs text-gray-400">{cliente.visitas} visitas</p>
                </div>
              </button>
            )
          })}
        </div>
      )}

      {selectedCliente && (
        <ClienteModal
          cliente={selectedCliente}
          onClose={() => setSelectedCliente(null)}
          onUpdated={() => {
            fetchClientes()
            setToast({ type: 'success', text: 'Cliente actualizado' })
          }}
        />
      )}

      {showNuevo && (
        <NuevoClienteModal
          onClose={() => setShowNuevo(false)}
          onCreated={(c) => {
            setShowNuevo(false)
            fetchClientes()
            setToast({ type: 'success', text: `${c.nombre} registrado` })
          }}
        />
      )}

      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </div>
  )
}
