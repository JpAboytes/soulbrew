import { useState, useEffect, useCallback } from 'react'
import {
  Minus, Plus, Trash2, ShoppingCart, AlertTriangle,
  X, Phone, User, Star, CheckCircle,
  Banknote, ArrowLeftRight,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import ProductoCard from '../components/ProductoCard'

const CATEGORIAS = ['Todos', 'Bebidas', 'Alimentos', 'Postres']

// ─── Modal registrar cliente (desde caja) ────────────────────────────────────

function RegistrarClienteModal({ telefonoInicial, onClose, onRegistered }) {
  const [form, setForm] = useState({ nombre: '', telefono: telefonoInicial || '', email: '' })
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
    if (!error) onRegistered(data)
    else alert(error.message)
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl">
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-xl font-bold text-[#42241A]">Registrar Cliente</h2>
          <button onClick={onClose} className="min-h-[44px] min-w-[44px] flex items-center justify-center text-gray-400">
            <X size={22} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-[#42241A] mb-1">Nombre *</label>
            <input
              value={form.nombre}
              onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
              required autoFocus placeholder="Nombre completo"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#4E5B3D]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#42241A] mb-1">Teléfono</label>
            <input
              type="tel"
              value={form.telefono}
              onChange={e => setForm(f => ({ ...f, telefono: e.target.value.replace(/\D/g, '') }))}
              placeholder="10 dígitos" maxLength={10}
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
            className="w-full bg-[#4E5B3D] hover:bg-[#3E4A30] disabled:opacity-60 text-[#FAFAF7] font-bold py-3.5 rounded-xl transition-colors min-h-[52px] mt-1"
          >
            {loading ? 'Registrando...' : 'Registrar y seleccionar'}
          </button>
        </form>
      </div>
    </div>
  )
}

// ─── Modal resumen de venta ───────────────────────────────────────────────────

function VentaResumenModal({ resumen, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 7000)
    return () => clearTimeout(t)
  }, [onClose])

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle size={32} className="text-green-600" />
        </div>
        <h2 className="text-xl font-bold text-[#42241A] mb-1">¡Venta registrada!</h2>

        <div className="bg-gray-50 rounded-2xl p-4 my-4 space-y-2 text-left">
          <div className="flex justify-between">
            <span className="text-sm text-gray-500">Total cobrado</span>
            <span className="font-bold text-[#42241A]">${resumen.totalCobrado.toFixed(2)}</span>
          </div>
          {resumen.descuento > 0 && (
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Descuento puntos</span>
              <span className="font-semibold text-green-600">−${resumen.descuento.toFixed(2)}</span>
            </div>
          )}
          {resumen.cliente && (
            <>
              <div className="border-t border-gray-200 my-1" />
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Cliente</span>
                <span className="font-semibold text-[#42241A]">{resumen.cliente.nombre}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Puntos ganados</span>
                <span className="font-bold text-[#4E5B3D]">+{resumen.puntosGanados} pts</span>
              </div>
              {resumen.puntosCanjeados > 0 && (
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Puntos canjeados</span>
                  <span className="font-semibold text-red-500">−{resumen.puntosCanjeados} pts</span>
                </div>
              )}
              <div className="flex justify-between border-t border-gray-200 pt-2 mt-1">
                <span className="text-sm font-semibold text-[#42241A]">Puntos totales</span>
                <span className="font-bold text-[#4E5B3D]">{resumen.nuevosTotales} pts</span>
              </div>
            </>
          )}
        </div>

        <button
          onClick={onClose}
          className="w-full bg-[#42241A] hover:bg-[#5C3A28] text-white font-bold py-3.5 rounded-xl transition-colors min-h-[52px]"
        >
          Nueva venta
        </button>
      </div>
    </div>
  )
}

// ─── POS principal ────────────────────────────────────────────────────────────

export default function Vender() {
  const { user } = useAuth()

  // Productos
  const [productos, setProductos] = useState([])
  const [productosConReceta, setProductosConReceta] = useState(new Set())
  const [loading, setLoading] = useState(true)
  const [categoria, setCategoria] = useState('Todos')

  // Carrito
  const [carrito, setCarrito] = useState([])
  const [notas, setNotas] = useState('')
  const [metodoPago, setMetodoPago] = useState('efectivo')

  // Cliente
  const [clienteQuery, setClienteQuery] = useState('')
  const [clienteBuscando, setClienteBuscando] = useState(false)
  const [clienteEncontrado, setClienteEncontrado] = useState(undefined) // undefined=sin buscar, null=no existe, obj=encontrado
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null)
  const [showRegistrar, setShowRegistrar] = useState(false)

  // Puntos
  const [puntosACanjear, setPuntosACanjear] = useState(0)

  // Flujo
  const [confirming, setConfirming] = useState(false)
  const [ventaResumen, setVentaResumen] = useState(null)
  const [toastError, setToastError] = useState(null)

  // ── Fetch productos ──────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    const [{ data: prods }, { data: recetas }] = await Promise.all([
      supabase.from('productos').select('*').eq('activo', true).order('nombre'),
      supabase.from('recetas').select('producto_id'),
    ])
    if (prods) setProductos(prods)
    if (recetas) setProductosConReceta(new Set(recetas.map(r => r.producto_id)))
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  // ── Búsqueda de cliente con debounce ──────────────────────────────────────
  useEffect(() => {
    if (clienteSeleccionado) return
    if (clienteQuery.length < 7) {
      setClienteEncontrado(undefined)
      setClienteBuscando(false)
      return
    }
    setClienteBuscando(true)
    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from('clientes')
        .select('*')
        .eq('telefono', clienteQuery)
        .maybeSingle()
      setClienteEncontrado(data ?? null)
      setClienteBuscando(false)
    }, 300)
    return () => clearTimeout(timer)
  }, [clienteQuery, clienteSeleccionado])

  // ── Carrito ────────────────────────────────────────────────────────────────
  function addToCart(producto) {
    setCarrito(prev => {
      const ex = prev.find(i => i.id === producto.id)
      return ex
        ? prev.map(i => i.id === producto.id ? { ...i, cantidad: i.cantidad + 1 } : i)
        : [...prev, { ...producto, cantidad: 1 }]
    })
  }

  function updateCantidad(id, delta) {
    setCarrito(prev =>
      prev.map(i => i.id === id ? { ...i, cantidad: Math.max(0, i.cantidad + delta) } : i)
          .filter(i => i.cantidad > 0)
    )
  }

  function removeItem(id) {
    setCarrito(prev => prev.filter(i => i.id !== id))
  }

  // ── Cliente ────────────────────────────────────────────────────────────────
  function seleccionarCliente(c) {
    setClienteSeleccionado(c)
    setClienteQuery(c.telefono || '')
    setPuntosACanjear(0)
  }

  function deseleccionarCliente() {
    setClienteSeleccionado(null)
    setClienteQuery('')
    setClienteEncontrado(undefined)
    setPuntosACanjear(0)
  }

  // ── Computed ───────────────────────────────────────────────────────────────
  const total = carrito.reduce((s, i) => s + i.precio * i.cantidad, 0)
  const totalItems = carrito.reduce((s, i) => s + i.cantidad, 0)
  const sinReceta = carrito.filter(i => !productosConReceta.has(i.id))
  const maxCanje = clienteSeleccionado
    ? Math.floor(clienteSeleccionado.puntos_acumulados / 100) * 100
    : 0
  const descuento = (puntosACanjear / 100) * 10
  const totalFinal = Math.max(0, total - descuento)

  // ── Confirmar venta ────────────────────────────────────────────────────────
  async function confirmarVenta() {
    if (carrito.length === 0) return
    setConfirming(true)
    try {
      // 1. Venta
      const { data: venta, error: eVenta } = await supabase
        .from('ventas')
        .insert({
          total: totalFinal,
          notas: notas || null,
          created_by: user.id,
          cliente_id: clienteSeleccionado?.id ?? null,
          metodo_pago: metodoPago,
        })
        .select().single()
      if (eVenta) throw eVenta

      // 2. Items
      const { error: eItems } = await supabase.from('venta_items').insert(
        carrito.map(item => ({
          venta_id: venta.id,
          producto_id: item.id,
          cantidad: item.cantidad,
          precio_unitario: item.precio,
        }))
      )
      if (eItems) throw eItems

      // 3. Descontar insumos
      const { error: eRpc } = await supabase.rpc('descontar_insumos_venta', { p_venta_id: venta.id })
      if (eRpc) throw eRpc

      // 4. Puntos
      let puntosGanados = 0
      let nuevosTotales = clienteSeleccionado?.puntos_acumulados ?? 0

      if (clienteSeleccionado) {
        puntosGanados = Math.floor(total) // sobre total sin descuento
        nuevosTotales = clienteSeleccionado.puntos_acumulados + puntosGanados - puntosACanjear

        await supabase.from('clientes').update({
          puntos_acumulados: nuevosTotales,
          visitas: clienteSeleccionado.visitas + 1,
        }).eq('id', clienteSeleccionado.id)

        await supabase.from('puntos_historial').insert({
          cliente_id: clienteSeleccionado.id,
          venta_id: venta.id,
          puntos: puntosGanados,
          concepto: 'compra',
        })

        if (puntosACanjear > 0) {
          await supabase.from('puntos_historial').insert({
            cliente_id: clienteSeleccionado.id,
            venta_id: venta.id,
            puntos: -puntosACanjear,
            concepto: 'canje',
          })
        }
      }

      // Mostrar resumen y limpiar
      setVentaResumen({
        totalCobrado: totalFinal,
        descuento,
        puntosGanados,
        puntosCanjeados: puntosACanjear,
        cliente: clienteSeleccionado,
        nuevosTotales,
      })
      setCarrito([])
      setNotas('')
      setMetodoPago('efectivo')
      deseleccionarCliente()
    } catch (err) {
      setToastError(err.message || 'Error al registrar la venta')
    } finally {
      setConfirming(false)
    }
  }

  const filtered = categoria === 'Todos' ? productos : productos.filter(p => p.categoria === categoria)

  return (
    <div className="flex h-screen overflow-hidden">
      {/* ── Grid de productos ─────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex gap-2 p-4 pb-3 overflow-x-auto border-b border-gray-100 bg-[#FAFAF7] shrink-0">
          {CATEGORIAS.map(cat => (
            <button
              key={cat}
              onClick={() => setCategoria(cat)}
              className={`px-5 py-2.5 rounded-xl font-medium text-sm whitespace-nowrap transition-colors min-h-[44px] ${
                categoria === cat
                  ? 'bg-[#42241A] text-white'
                  : 'bg-white text-[#42241A] hover:bg-gray-100 border border-gray-100'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#4E5B3D] border-t-transparent" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              <p>Sin productos en esta categoría</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
              {filtered.map(p => (
                <ProductoCard key={p.id} producto={p} onAdd={addToCart} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Panel carrito ────────────────────────────────────────────────── */}
      <div className="w-80 bg-white border-l border-gray-100 flex flex-col shadow-xl shrink-0">
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-2">
            <ShoppingCart size={20} className="text-[#42241A]" />
            <h2 className="font-bold text-[#42241A] text-lg">Carrito</h2>
            {totalItems > 0 && (
              <span className="ml-auto bg-[#4E5B3D] text-[#FAFAF7] text-sm font-bold rounded-full min-w-[24px] h-6 flex items-center justify-center px-1.5">
                {totalItems}
              </span>
            )}
          </div>
        </div>

        {/* Sección cliente — siempre visible */}
        <div className="px-4 py-3 border-b border-gray-100 shrink-0">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Cliente</p>

          {!clienteSeleccionado ? (
            <>
              <div className="relative">
                <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="tel"
                  inputMode="numeric"
                  value={clienteQuery}
                  onChange={e => setClienteQuery(e.target.value.replace(/\D/g, ''))}
                  placeholder="Teléfono del cliente"
                  maxLength={10}
                  className="w-full border border-gray-200 rounded-xl pl-9 pr-8 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#4E5B3D] min-h-[44px]"
                />
                {clienteBuscando && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-[#4E5B3D] border-t-transparent" />
                  </div>
                )}
                {clienteQuery && !clienteBuscando && (
                  <button
                    onClick={() => { setClienteQuery(''); setClienteEncontrado(undefined) }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Cliente encontrado */}
              {clienteEncontrado && (
                <button
                  onClick={() => seleccionarCliente(clienteEncontrado)}
                  className="mt-2 w-full bg-[#4E5B3D]/10 hover:bg-[#4E5B3D]/20 border border-[#4E5B3D]/30 rounded-xl px-3 py-2.5 text-left transition-colors"
                >
                  <p className="font-semibold text-[#42241A] text-sm">{clienteEncontrado.nombre}</p>
                  <p className="text-xs text-[#7C5A43]">
                    {clienteEncontrado.puntos_acumulados} pts · {clienteEncontrado.visitas} visitas
                  </p>
                </button>
              )}

              {/* No encontrado */}
              {clienteEncontrado === null && clienteQuery.length >= 7 && !clienteBuscando && (
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={() => setShowRegistrar(true)}
                    className="flex-1 bg-[#42241A] hover:bg-[#5C3A28] text-white text-xs font-semibold rounded-xl py-2.5 min-h-[40px] transition-colors"
                  >
                    + Registrar nuevo
                  </button>
                  <button
                    onClick={() => { setClienteQuery(''); setClienteEncontrado(undefined) }}
                    className="text-xs text-gray-400 hover:text-gray-600 px-3 min-h-[40px]"
                  >
                    Limpiar
                  </button>
                </div>
              )}

              {!clienteQuery && (
                <p className="text-xs text-gray-400 text-center mt-1.5">Sin cliente asignado</p>
              )}
            </>
          ) : (
            /* Cliente seleccionado */
            <div className="flex items-center gap-2 bg-[#4E5B3D]/10 rounded-xl px-3 py-2.5">
              <User size={16} className="text-[#4E5B3D] shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-[#42241A] text-sm truncate">{clienteSeleccionado.nombre}</p>
                <p className="text-xs text-[#7C5A43]">
                  {clienteSeleccionado.puntos_acumulados} pts disponibles
                </p>
              </div>
              <button
                onClick={deseleccionarCliente}
                className="text-gray-400 hover:text-gray-600 min-h-[36px] min-w-[36px] flex items-center justify-center transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          )}
        </div>

        {/* Items del carrito */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {carrito.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-300 pb-6">
              <ShoppingCart size={44} />
              <p className="mt-2 text-sm font-medium">Carrito vacío</p>
              <p className="text-xs mt-1">Toca un producto para agregar</p>
            </div>
          ) : (
            carrito.map(item => (
              <div key={item.id} className="bg-gray-50 rounded-2xl p-3">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-[#42241A] text-sm leading-tight truncate">{item.nombre}</p>
                    {!productosConReceta.has(item.id) && (
                      <p className="text-xs text-amber-600 flex items-center gap-1 mt-0.5">
                        <AlertTriangle size={10} />Sin receta
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => removeItem(item.id)}
                    className="text-red-300 hover:text-red-500 min-h-[32px] min-w-[32px] flex items-center justify-center ml-1 transition-colors"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateCantidad(item.id, -1)}
                      className="bg-white border border-gray-200 rounded-lg min-h-[32px] min-w-[32px] flex items-center justify-center hover:bg-gray-100 transition-colors"
                    >
                      <Minus size={12} />
                    </button>
                    <span className="font-bold text-[#42241A] w-5 text-center text-sm">{item.cantidad}</span>
                    <button
                      onClick={() => updateCantidad(item.id, 1)}
                      className="bg-white border border-gray-200 rounded-lg min-h-[32px] min-w-[32px] flex items-center justify-center hover:bg-gray-100 transition-colors"
                    >
                      <Plus size={12} />
                    </button>
                  </div>
                  <p className="font-bold text-[#4E5B3D] text-sm">
                    ${(item.precio * item.cantidad).toFixed(2)}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer — solo cuando hay items */}
        {carrito.length > 0 && (
          <div className="border-t border-gray-100 p-4 space-y-3 shrink-0">
            {/* Canje de puntos */}
            {clienteSeleccionado && maxCanje >= 100 && (
              <div className="bg-[#4E5B3D]/10 rounded-xl p-3 border border-[#4E5B3D]/20">
                <p className="text-xs font-bold text-[#42241A] mb-2 flex items-center gap-1">
                  <Star size={12} className="text-[#4E5B3D]" />
                  Canjear puntos
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPuntosACanjear(p => Math.max(0, p - 100))}
                    disabled={puntosACanjear === 0}
                    className="bg-white border border-gray-200 rounded-lg min-h-[36px] min-w-[36px] flex items-center justify-center disabled:opacity-40 transition-colors"
                  >
                    <Minus size={12} />
                  </button>
                  <div className="flex-1 text-center">
                    <p className="font-bold text-[#42241A] text-base">{puntosACanjear} pts</p>
                    {puntosACanjear > 0 && (
                      <p className="text-xs text-green-600 font-semibold">−${descuento.toFixed(2)}</p>
                    )}
                  </div>
                  <button
                    onClick={() => setPuntosACanjear(p => Math.min(maxCanje, p + 100))}
                    disabled={puntosACanjear >= maxCanje}
                    className="bg-white border border-gray-200 rounded-lg min-h-[36px] min-w-[36px] flex items-center justify-center disabled:opacity-40 transition-colors"
                  >
                    <Plus size={12} />
                  </button>
                </div>
                <p className="text-[10px] text-gray-500 text-center mt-1.5">
                  Máx {maxCanje} pts = ${(maxCanje / 100 * 10).toFixed(2)} descuento
                </p>
              </div>
            )}

            {/* Advertencia sin receta */}
            {sinReceta.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-2.5 flex gap-2">
                <AlertTriangle size={14} className="text-amber-600 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700">
                  {sinReceta.length} producto{sinReceta.length > 1 ? 's' : ''} sin receta — inventario no se descontará.
                </p>
              </div>
            )}

            {/* Método de pago */}
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Método de pago</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: 'efectivo', label: 'Efectivo', icon: Banknote },
                  { value: 'transferencia', label: 'Transferencia', icon: ArrowLeftRight },
                ].map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setMetodoPago(value)}
                    className={`flex flex-col items-center justify-center gap-1 rounded-xl py-2 min-h-[52px] border text-xs font-semibold transition-colors ${
                      metodoPago === value
                        ? 'bg-[#42241A] text-white border-[#42241A]'
                        : 'bg-white text-[#42241A] border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <Icon size={16} />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Notas */}
            <textarea
              value={notas}
              onChange={e => setNotas(e.target.value)}
              placeholder="Notas de la venta..."
              rows={2}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#4E5B3D] resize-none"
            />

            {/* Total */}
            <div className="space-y-1">
              {descuento > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Subtotal</span>
                  <span className="text-gray-500">${total.toFixed(2)}</span>
                </div>
              )}
              {descuento > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-green-600">Descuento</span>
                  <span className="text-green-600">−${descuento.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between items-baseline">
                <span className="font-bold text-[#42241A]">Total</span>
                <span className="text-2xl font-bold text-[#42241A]">${totalFinal.toFixed(2)}</span>
              </div>
            </div>

            {/* Confirmar */}
            <button
              onClick={confirmarVenta}
              disabled={confirming}
              className="w-full bg-[#4E5B3D] hover:bg-[#3E4A30] disabled:opacity-60 text-[#FAFAF7] font-bold py-4 rounded-xl text-base transition-colors min-h-[56px]"
            >
              {confirming ? 'Procesando...' : 'Confirmar Venta'}
            </button>
          </div>
        )}
      </div>

      {/* ── Modales ──────────────────────────────────────────────────────── */}
      {showRegistrar && (
        <RegistrarClienteModal
          telefonoInicial={clienteQuery}
          onClose={() => setShowRegistrar(false)}
          onRegistered={(c) => {
            setShowRegistrar(false)
            seleccionarCliente(c)
          }}
        />
      )}

      {ventaResumen && (
        <VentaResumenModal
          resumen={ventaResumen}
          onClose={() => setVentaResumen(null)}
        />
      )}

      {toastError && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-red-600 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3">
          <AlertTriangle size={18} />
          {toastError}
          <button onClick={() => setToastError(null)}><X size={16} /></button>
        </div>
      )}
    </div>
  )
}
