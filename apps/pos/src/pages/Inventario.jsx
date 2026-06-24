import { useState, useEffect, useCallback } from 'react'
import { Plus, X, AlertTriangle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import InsumoCard from '../components/InsumoCard'
import Toast from '../components/Toast'

const UNIDADES = ['g', 'kg', 'ml', 'l', 'piezas']

function NuevoInsumoModal({ onClose, onSaved }) {
  const [form, setForm] = useState({
    nombre: '',
    unidad: 'g',
    stock_actual: '',
    stock_minimo: '',
    costo_unitario: '',
  })
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.from('insumos').insert({
      nombre: form.nombre,
      unidad: form.unidad,
      stock_actual: parseFloat(form.stock_actual) || 0,
      stock_minimo: parseFloat(form.stock_minimo) || 0,
      costo_unitario: parseFloat(form.costo_unitario) || 0,
    })
    setLoading(false)
    if (!error) onSaved()
    else alert(error.message)
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 flex items-center justify-center p-6">
      <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-[#2C1810]">Nuevo Insumo</h2>
          <button
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center text-gray-400 hover:text-gray-600 rounded-xl"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#2C1810] mb-1">Nombre *</label>
            <input
              value={form.nombre}
              onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
              required
              placeholder="Ej. Café espresso"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#D4A853]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#2C1810] mb-1">Unidad *</label>
            <select
              value={form.unidad}
              onChange={e => setForm(f => ({ ...f, unidad: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#D4A853] bg-white"
            >
              {UNIDADES.map(u => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-[#2C1810] mb-1">Stock actual</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.stock_actual}
                onChange={e => setForm(f => ({ ...f, stock_actual: e.target.value }))}
                placeholder="0"
                className="w-full border border-gray-200 rounded-xl px-3 py-3 focus:outline-none focus:ring-2 focus:ring-[#D4A853]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#2C1810] mb-1">Stock mín.</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.stock_minimo}
                onChange={e => setForm(f => ({ ...f, stock_minimo: e.target.value }))}
                placeholder="0"
                className="w-full border border-gray-200 rounded-xl px-3 py-3 focus:outline-none focus:ring-2 focus:ring-[#D4A853]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#2C1810] mb-1">Costo/u</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.costo_unitario}
                onChange={e => setForm(f => ({ ...f, costo_unitario: e.target.value }))}
                placeholder="0.00"
                className="w-full border border-gray-200 rounded-xl px-3 py-3 focus:outline-none focus:ring-2 focus:ring-[#D4A853]"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#D4A853] hover:bg-[#c49843] disabled:opacity-60 text-[#2C1810] font-bold py-4 rounded-xl text-base transition-colors min-h-[52px]"
          >
            {loading ? 'Guardando...' : 'Guardar Insumo'}
          </button>
        </form>
      </div>
    </div>
  )
}

function RestockModal({ insumo, onClose, onSaved }) {
  const { user } = useAuth()
  const [cantidad, setCantidad] = useState('')
  const [costo, setCosto] = useState('')
  const [notas, setNotas] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!cantidad || parseFloat(cantidad) <= 0) return
    setLoading(true)

    const qty = parseFloat(cantidad)

    const { error: restockError } = await supabase.from('restock').insert({
      insumo_id: insumo.id,
      cantidad: qty,
      costo_total: parseFloat(costo) || 0,
      notas: notas || null,
      created_by: user.id,
    })

    if (restockError) {
      setLoading(false)
      alert(restockError.message)
      return
    }

    const { error: updateError } = await supabase
      .from('insumos')
      .update({ stock_actual: Number(insumo.stock_actual) + qty })
      .eq('id', insumo.id)

    setLoading(false)
    if (!updateError) onSaved()
    else alert(updateError.message)
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 flex items-center justify-center p-6">
      <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl font-bold text-[#2C1810]">Restock</h2>
            <p className="text-[#8B5A3C] text-sm">{insumo.nombre}</p>
          </div>
          <button
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center text-gray-400 hover:text-gray-600 rounded-xl"
          >
            <X size={24} />
          </button>
        </div>

        <div className="bg-gray-50 rounded-xl p-4 mb-5">
          <p className="text-sm text-gray-500">
            Stock actual:{' '}
            <span className="font-bold text-[#2C1810]">
              {Number(insumo.stock_actual).toFixed(2)} {insumo.unidad}
            </span>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#2C1810] mb-1">
              Cantidad a agregar * ({insumo.unidad})
            </label>
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={cantidad}
              onChange={e => setCantidad(e.target.value)}
              required
              placeholder="0.00"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-[#D4A853]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#2C1810] mb-1">
              Costo total (opcional)
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={costo}
              onChange={e => setCosto(e.target.value)}
              placeholder="$0.00"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#D4A853]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#2C1810] mb-1">
              Notas (opcional)
            </label>
            <textarea
              value={notas}
              onChange={e => setNotas(e.target.value)}
              placeholder="Proveedor, número de factura..."
              rows={2}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#D4A853] resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#D4A853] hover:bg-[#c49843] disabled:opacity-60 text-[#2C1810] font-bold py-4 rounded-xl text-base transition-colors min-h-[52px]"
          >
            {loading ? 'Guardando...' : 'Confirmar Restock'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default function Inventario() {
  const [insumos, setInsumos] = useState([])
  const [loading, setLoading] = useState(true)
  const [showNuevo, setShowNuevo] = useState(false)
  const [restockTarget, setRestockTarget] = useState(null)
  const [toast, setToast] = useState(null)

  const fetchInsumos = useCallback(async () => {
    const { data } = await supabase.from('insumos').select('*').order('nombre')
    if (data) {
      const sorted = [...data].sort((a, b) => {
        const aCrit = a.stock_actual <= a.stock_minimo
        const bCrit = b.stock_actual <= b.stock_minimo
        if (aCrit && !bCrit) return -1
        if (!aCrit && bCrit) return 1
        const aLow = a.stock_actual <= a.stock_minimo * 1.5
        const bLow = b.stock_actual <= b.stock_minimo * 1.5
        if (aLow && !bLow) return -1
        if (!aLow && bLow) return 1
        return 0
      })
      setInsumos(sorted)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchInsumos()
  }, [fetchInsumos])

  const criticalCount = insumos.filter(i => i.stock_actual <= i.stock_minimo).length

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#2C1810]">Inventario</h1>
          {criticalCount > 0 && (
            <p className="text-red-600 text-sm font-medium flex items-center gap-1 mt-1">
              <AlertTriangle size={14} />
              {criticalCount} insumo{criticalCount > 1 ? 's' : ''} crítico{criticalCount > 1 ? 's' : ''}
            </p>
          )}
        </div>
        <button
          onClick={() => setShowNuevo(true)}
          className="flex items-center gap-2 bg-[#2C1810] hover:bg-[#5C3317] text-white font-semibold px-5 py-3 rounded-xl transition-colors min-h-[48px]"
        >
          <Plus size={20} />
          Nuevo Insumo
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#D4A853] border-t-transparent" />
        </div>
      ) : insumos.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-lg">No hay insumos registrados</p>
          <p className="text-sm mt-1">Crea el primer insumo con el botón de arriba</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {insumos.map(insumo => (
            <InsumoCard key={insumo.id} insumo={insumo} onRestock={setRestockTarget} />
          ))}
        </div>
      )}

      {showNuevo && (
        <NuevoInsumoModal
          onClose={() => setShowNuevo(false)}
          onSaved={() => {
            setShowNuevo(false)
            fetchInsumos()
            setToast({ type: 'success', text: 'Insumo creado exitosamente' })
          }}
        />
      )}

      {restockTarget && (
        <RestockModal
          insumo={restockTarget}
          onClose={() => setRestockTarget(null)}
          onSaved={() => {
            setRestockTarget(null)
            fetchInsumos()
            setToast({ type: 'success', text: 'Restock registrado exitosamente' })
          }}
        />
      )}

      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </div>
  )
}
