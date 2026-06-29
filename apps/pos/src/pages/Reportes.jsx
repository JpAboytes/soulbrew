import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Calendar, DollarSign, Receipt, ShoppingBag, TrendingUp,
  Banknote, CreditCard, ArrowLeftRight, Wallet, Save, AlertTriangle,
  CheckCircle, Lock,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

const METODOS = {
  efectivo: { label: 'Efectivo', icon: Banknote, color: '#16a34a' },
  tarjeta: { label: 'Tarjeta', icon: CreditCard, color: '#2563eb' },
  transferencia: { label: 'Transferencia', icon: ArrowLeftRight, color: '#9333ea' },
}

const money = (n) => `$${Number(n || 0).toFixed(2)}`
const num = (n) => Number(n || 0)

// 'YYYY-MM-DD' local → rango ISO (UTC) del día completo
function dayRange(dateStr) {
  const start = new Date(`${dateStr}T00:00:00`)
  const end = new Date(`${dateStr}T23:59:59.999`)
  return { startISO: start.toISOString(), endISO: end.toISOString() }
}

// 'YYYY-MM' → rango ISO del mes y nº de días
function monthRange(ym) {
  const [y, m] = ym.split('-').map(Number)
  const start = new Date(y, m - 1, 1, 0, 0, 0)
  const days = new Date(y, m, 0).getDate()
  const end = new Date(y, m - 1, days, 23, 59, 59, 999)
  return { startISO: start.toISOString(), endISO: end.toISOString(), days, y, m }
}

const hoyStr = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const mesStr = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

// Suma ventas por método de pago
function desglosePorMetodo(ventas) {
  const acc = { efectivo: 0, tarjeta: 0, transferencia: 0 }
  for (const v of ventas) acc[v.metodo_pago || 'efectivo'] += num(v.total)
  return acc
}

// Agrupa venta_items en top productos
function topProductos(items, limit = 8) {
  const map = new Map()
  for (const it of items) {
    const nombre = it.productos?.nombre || 'Producto eliminado'
    const cur = map.get(nombre) || { nombre, unidades: 0, importe: 0 }
    cur.unidades += num(it.cantidad)
    cur.importe += num(it.cantidad) * num(it.precio_unitario)
    map.set(nombre, cur)
  }
  return [...map.values()].sort((a, b) => b.importe - a.importe).slice(0, limit)
}

// ─── Componentes UI compartidos ────────────────────────────────────────────────

function KpiCard({ icon: Icon, label, value, sub, accent = '#42241A' }) {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
      <div className="flex items-center gap-2 mb-1.5">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${accent}1a` }}>
          <Icon size={16} style={{ color: accent }} />
        </div>
        <p className="text-xs font-medium text-gray-500">{label}</p>
      </div>
      <p className="text-2xl font-bold text-[#42241A] leading-tight">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  )
}

function MetodoBreakdown({ desglose, total }) {
  return (
    <div className="space-y-2">
      {Object.entries(METODOS).map(([key, { label, icon: Icon, color }]) => {
        const monto = desglose[key] || 0
        const pct = total > 0 ? (monto / total) * 100 : 0
        return (
          <div key={key}>
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="flex items-center gap-2 text-[#42241A] font-medium">
                <Icon size={15} style={{ color }} /> {label}
              </span>
              <span className="font-semibold text-[#42241A]">{money(monto)}</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

function TopProductosList({ productos }) {
  if (productos.length === 0) {
    return <p className="text-sm text-gray-400 italic text-center py-6">Sin productos vendidos</p>
  }
  const max = productos[0]?.importe || 1
  return (
    <div className="space-y-2.5">
      {productos.map((p, i) => (
        <div key={p.nombre} className="flex items-center gap-3">
          <span className="w-5 text-center text-xs font-bold text-gray-400 shrink-0">{i + 1}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-[#42241A] truncate">{p.nombre}</span>
              <span className="text-xs text-gray-400 shrink-0 ml-2">{p.unidades} u · {money(p.importe)}</span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-[#4E5B3D] rounded-full" style={{ width: `${(p.importe / max) * 100}%` }} />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function Spinner() {
  return (
    <div className="flex justify-center py-20">
      <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#4E5B3D] border-t-transparent" />
    </div>
  )
}

// ─── Panel de cierre de caja ───────────────────────────────────────────────────

function CorteCajaPanel({ fecha, periodStart, ventasPeriodo, descuentosPeriodo, onSaved }) {
  const { user } = useAuth()
  const [fondo, setFondo] = useState('')
  const [contado, setContado] = useState('')
  const [notas, setNotas] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const desglose = desglosePorMetodo(ventasPeriodo)
  const totalVentas = ventasPeriodo.reduce((s, v) => s + num(v.total), 0)
  const fondoNum = num(parseFloat(fondo))
  const esperado = fondoNum + desglose.efectivo
  const contadoNum = contado === '' ? null : num(parseFloat(contado))
  const diferencia = contadoNum === null ? null : contadoNum - esperado

  async function cerrarCorte() {
    setSaving(true)
    setError(null)
    const { error: e } = await supabase.from('cortes').insert({
      fecha,
      inicio: periodStart.toISOString(),
      fin: new Date().toISOString(),
      fondo_inicial: fondoNum,
      total_ventas: totalVentas,
      num_ventas: ventasPeriodo.length,
      total_efectivo: desglose.efectivo,
      total_tarjeta: desglose.tarjeta,
      total_transferencia: desglose.transferencia,
      descuentos: descuentosPeriodo,
      efectivo_esperado: esperado,
      efectivo_contado: contadoNum ?? 0,
      diferencia: diferencia ?? 0,
      notas: notas.trim() || null,
      created_by: user.id,
    })
    setSaving(false)
    if (e) { setError(e.message); return }
    onSaved()
  }

  const horaInicio = periodStart.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
      <div className="flex items-center gap-2 mb-1">
        <Wallet size={18} className="text-[#4E5B3D]" />
        <h3 className="font-bold text-[#42241A]">Cierre de caja</h3>
      </div>
      <p className="text-xs text-gray-400 mb-4">
        Ventas sin cortar desde las {horaInicio} · {ventasPeriodo.length} venta{ventasPeriodo.length === 1 ? '' : 's'}
      </p>

      {ventasPeriodo.length === 0 ? (
        <p className="text-sm text-gray-400 italic text-center py-6">No hay ventas pendientes de corte.</p>
      ) : (
        <>
          {/* Resumen del periodo */}
          <div className="bg-gray-50 rounded-xl p-3 mb-4 space-y-1.5 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">Ventas del periodo</span><span className="font-semibold text-[#42241A]">{money(totalVentas)}</span></div>
            <div className="flex justify-between"><span className="text-gray-500 flex items-center gap-1"><Banknote size={13} className="text-green-600" /> En efectivo</span><span className="font-semibold text-[#42241A]">{money(desglose.efectivo)}</span></div>
            <div className="flex justify-between"><span className="text-gray-500 flex items-center gap-1"><CreditCard size={13} className="text-blue-600" /> Tarjeta</span><span className="text-gray-500">{money(desglose.tarjeta)}</span></div>
            <div className="flex justify-between"><span className="text-gray-500 flex items-center gap-1"><ArrowLeftRight size={13} className="text-purple-600" /> Transferencia</span><span className="text-gray-500">{money(desglose.transferencia)}</span></div>
          </div>

          {/* Inputs */}
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-xs font-medium text-[#42241A] mb-1">Fondo de caja</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                <input
                  type="number" inputMode="decimal" min="0" step="any"
                  value={fondo} onChange={e => setFondo(e.target.value)}
                  placeholder="0.00"
                  className="w-full border border-gray-200 rounded-xl pl-7 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#4E5B3D] min-h-[44px]"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#42241A] mb-1">Efectivo contado</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                <input
                  type="number" inputMode="decimal" min="0" step="any"
                  value={contado} onChange={e => setContado(e.target.value)}
                  placeholder="0.00"
                  className="w-full border border-gray-200 rounded-xl pl-7 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#4E5B3D] min-h-[44px]"
                />
              </div>
            </div>
          </div>

          {/* Esperado vs diferencia */}
          <div className="space-y-1.5 mb-4 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Efectivo esperado (fondo + ventas)</span>
              <span className="font-semibold text-[#42241A]">{money(esperado)}</span>
            </div>
            {diferencia !== null && (
              <div className={`flex justify-between font-bold rounded-xl px-3 py-2 ${
                Math.abs(diferencia) < 0.01 ? 'bg-green-50 text-green-700'
                  : diferencia > 0 ? 'bg-blue-50 text-blue-700' : 'bg-red-50 text-red-600'
              }`}>
                <span>{Math.abs(diferencia) < 0.01 ? 'Caja cuadrada' : diferencia > 0 ? 'Sobrante' : 'Faltante'}</span>
                <span>{diferencia > 0 ? '+' : ''}{money(diferencia)}</span>
              </div>
            )}
          </div>

          <input
            value={notas} onChange={e => setNotas(e.target.value)}
            placeholder="Notas del corte (opcional)"
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#4E5B3D] mb-3 min-h-[44px]"
          />

          {error && (
            <p className="text-xs text-red-600 mb-3 flex items-center gap-1"><AlertTriangle size={13} /> {error}</p>
          )}

          <button
            onClick={cerrarCorte}
            disabled={saving || contado === ''}
            className="w-full bg-[#42241A] hover:bg-[#5C3A28] disabled:opacity-50 text-white font-bold py-3.5 rounded-xl transition-colors min-h-[52px] flex items-center justify-center gap-2"
          >
            <Save size={18} />
            {saving ? 'Guardando...' : 'Cerrar corte'}
          </button>
        </>
      )}
    </div>
  )
}

// ─── Pestaña: Corte del día ─────────────────────────────────────────────────────

function DiaTab() {
  const [fecha, setFecha] = useState(hoyStr())
  const [loading, setLoading] = useState(true)
  const [ventas, setVentas] = useState([])
  const [items, setItems] = useState([])
  const [descuentos, setDescuentos] = useState(0)
  const [cortes, setCortes] = useState([])

  const fetchDia = useCallback(async () => {
    setLoading(true)
    const { startISO, endISO } = dayRange(fecha)

    const { data: ventasData } = await supabase
      .from('ventas')
      .select('id, total, metodo_pago, notas, created_at, cliente_id, clientes(nombre)')
      .gte('created_at', startISO).lte('created_at', endISO)
      .order('created_at', { ascending: false })
    const vts = ventasData || []
    setVentas(vts)

    const ids = vts.map(v => v.id)
    const [itemsRes, canjesRes, cortesRes] = await Promise.all([
      ids.length
        ? supabase.from('venta_items').select('cantidad, precio_unitario, producto_id, productos(nombre)').in('venta_id', ids)
        : Promise.resolve({ data: [] }),
      supabase.from('puntos_historial').select('puntos').eq('concepto', 'canje').gte('created_at', startISO).lte('created_at', endISO),
      supabase.from('cortes').select('*').eq('fecha', fecha).order('fin', { ascending: true }),
    ])
    setItems(itemsRes.data || [])
    setDescuentos((canjesRes.data || []).reduce((s, c) => s + Math.abs(num(c.puntos)), 0) / 100 * 10)
    setCortes(cortesRes.data || [])
    setLoading(false)
  }, [fecha])

  useEffect(() => { fetchDia() }, [fetchDia])

  const totalDia = ventas.reduce((s, v) => s + num(v.total), 0)
  const unidades = items.reduce((s, it) => s + num(it.cantidad), 0)
  const ticket = ventas.length ? totalDia / ventas.length : 0
  const desglose = useMemo(() => desglosePorMetodo(ventas), [ventas])
  const top = useMemo(() => topProductos(items), [items])

  const esHoy = fecha === hoyStr()
  const ultimoCorteFin = cortes.length ? cortes[cortes.length - 1].fin : null
  const periodStart = ultimoCorteFin ? new Date(ultimoCorteFin) : new Date(`${fecha}T00:00:00`)
  const ventasPeriodo = useMemo(
    () => ventas.filter(v => new Date(v.created_at) >= periodStart),
    [ventas, ultimoCorteFin, fecha]
  )

  return (
    <div className="space-y-5">
      {/* Selector de fecha */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative">
          <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="date" value={fecha} max={hoyStr()}
            onChange={e => setFecha(e.target.value)}
            className="border border-gray-200 rounded-xl pl-9 pr-3 py-2.5 text-sm font-medium text-[#42241A] focus:outline-none focus:ring-2 focus:ring-[#4E5B3D] bg-white min-h-[44px]"
          />
        </div>
        {!esHoy && (
          <button onClick={() => setFecha(hoyStr())} className="text-sm text-[#4E5B3D] font-medium hover:underline">
            Ir a hoy
          </button>
        )}
      </div>

      {loading ? <Spinner /> : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KpiCard icon={DollarSign} label="Total cobrado" value={money(totalDia)} accent="#16a34a" />
            <KpiCard icon={Receipt} label="Ventas" value={ventas.length} sub={`Ticket prom. ${money(ticket)}`} accent="#42241A" />
            <KpiCard icon={ShoppingBag} label="Unidades" value={unidades} accent="#4E5B3D" />
            <KpiCard icon={TrendingUp} label="Descuentos puntos" value={money(descuentos)} accent="#9333ea" />
          </div>

          <div className="grid lg:grid-cols-2 gap-5">
            {/* Columna izquierda */}
            <div className="space-y-5">
              {/* Desglose por método */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                <h3 className="font-bold text-[#42241A] mb-4">Por método de pago</h3>
                <MetodoBreakdown desglose={desglose} total={totalDia} />
              </div>

              {/* Corte de caja (solo hoy) */}
              {esHoy ? (
                <CorteCajaPanel
                  fecha={fecha}
                  periodStart={periodStart}
                  ventasPeriodo={ventasPeriodo}
                  descuentosPeriodo={descuentos}
                  onSaved={fetchDia}
                />
              ) : (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex items-center gap-3 text-gray-400">
                  <Lock size={18} />
                  <p className="text-sm">El cierre de caja solo está disponible para el día de hoy.</p>
                </div>
              )}

              {/* Cortes registrados */}
              {cortes.length > 0 && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                  <h3 className="font-bold text-[#42241A] mb-3">Cortes del día ({cortes.length})</h3>
                  <div className="space-y-2 divide-y divide-gray-50">
                    {cortes.map((c, i) => (
                      <div key={c.id} className="pt-2 first:pt-0">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-[#42241A] flex items-center gap-1.5">
                            <CheckCircle size={14} className="text-green-600" />
                            Corte #{i + 1} · {new Date(c.fin).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <span className="text-sm font-bold text-[#42241A]">{money(c.total_ventas)}</span>
                        </div>
                        <div className="flex items-center justify-between mt-1 text-xs text-gray-400">
                          <span>Efectivo esperado {money(c.efectivo_esperado)} · contado {money(c.efectivo_contado)}</span>
                          <span className={Math.abs(num(c.diferencia)) < 0.01 ? 'text-green-600' : num(c.diferencia) < 0 ? 'text-red-500' : 'text-blue-500'}>
                            {num(c.diferencia) > 0 ? '+' : ''}{money(c.diferencia)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Columna derecha */}
            <div className="space-y-5">
              {/* Top productos */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                <h3 className="font-bold text-[#42241A] mb-4">Productos más vendidos</h3>
                <TopProductosList productos={top} />
              </div>

              {/* Ventas del día */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                <h3 className="font-bold text-[#42241A] mb-3">Ventas del día ({ventas.length})</h3>
                {ventas.length === 0 ? (
                  <p className="text-sm text-gray-400 italic text-center py-6">Sin ventas registradas</p>
                ) : (
                  <div className="divide-y divide-gray-50 max-h-[420px] overflow-y-auto -mx-1 px-1">
                    {ventas.map(v => {
                      const M = METODOS[v.metodo_pago || 'efectivo']
                      const Icon = M.icon
                      return (
                        <div key={v.id} className="flex items-center justify-between py-2.5">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-[#42241A]">
                              {new Date(v.created_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                              {v.clientes?.nombre && <span className="text-gray-400 font-normal"> · {v.clientes.nombre}</span>}
                            </p>
                            <p className="text-xs flex items-center gap-1" style={{ color: M.color }}>
                              <Icon size={12} /> {M.label}
                            </p>
                          </div>
                          <span className="font-bold text-[#42241A] text-sm shrink-0">{money(v.total)}</span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ─── Pestaña: Mensual ───────────────────────────────────────────────────────────

function MesTab() {
  const [ym, setYm] = useState(mesStr())
  const [loading, setLoading] = useState(true)
  const [ventas, setVentas] = useState([])
  const [items, setItems] = useState([])

  const fetchMes = useCallback(async () => {
    setLoading(true)
    const { startISO, endISO } = monthRange(ym)
    const { data: ventasData } = await supabase
      .from('ventas')
      .select('id, total, metodo_pago, created_at')
      .gte('created_at', startISO).lte('created_at', endISO)
      .order('created_at', { ascending: true })
    const vts = ventasData || []
    setVentas(vts)

    const ids = vts.map(v => v.id)
    const itemsRes = ids.length
      ? await supabase.from('venta_items').select('cantidad, precio_unitario, producto_id, productos(nombre)').in('venta_id', ids)
      : { data: [] }
    setItems(itemsRes.data || [])
    setLoading(false)
  }, [ym])

  useEffect(() => { fetchMes() }, [fetchMes])

  const { days } = monthRange(ym)
  const totalMes = ventas.reduce((s, v) => s + num(v.total), 0)
  const ticket = ventas.length ? totalMes / ventas.length : 0
  const desglose = useMemo(() => desglosePorMetodo(ventas), [ventas])
  const top = useMemo(() => topProductos(items, 10), [items])

  // Ventas por día del mes
  const porDia = useMemo(() => {
    const arr = Array.from({ length: days }, (_, i) => ({ dia: i + 1, total: 0, ventas: 0 }))
    for (const v of ventas) {
      const d = new Date(v.created_at).getDate()
      if (arr[d - 1]) { arr[d - 1].total += num(v.total); arr[d - 1].ventas += 1 }
    }
    return arr
  }, [ventas, days])
  const maxDia = Math.max(1, ...porDia.map(d => d.total))
  const mejorDia = porDia.reduce((a, b) => (b.total > a.total ? b : a), porDia[0] || { dia: 0, total: 0 })

  const [y, m] = ym.split('-').map(Number)

  return (
    <div className="space-y-5">
      {/* Selector de mes */}
      <div className="relative inline-block">
        <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        <input
          type="month" value={ym} max={mesStr()}
          onChange={e => setYm(e.target.value)}
          className="border border-gray-200 rounded-xl pl-9 pr-3 py-2.5 text-sm font-medium text-[#42241A] focus:outline-none focus:ring-2 focus:ring-[#4E5B3D] bg-white min-h-[44px]"
        />
      </div>

      {loading ? <Spinner /> : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KpiCard icon={DollarSign} label={`Total ${MESES[m - 1]}`} value={money(totalMes)} accent="#16a34a" />
            <KpiCard icon={Receipt} label="Ventas" value={ventas.length} sub={`Ticket prom. ${money(ticket)}`} accent="#42241A" />
            <KpiCard icon={TrendingUp} label="Mejor día" value={mejorDia.total > 0 ? `${mejorDia.dia} ${MESES[m - 1].slice(0, 3)}` : '—'} sub={mejorDia.total > 0 ? money(mejorDia.total) : null} accent="#4E5B3D" />
            <KpiCard icon={ShoppingBag} label="Prom. diario" value={money(totalMes / days)} accent="#9333ea" />
          </div>

          {/* Gráfica de barras por día */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <h3 className="font-bold text-[#42241A] mb-4">Ventas por día</h3>
            {totalMes === 0 ? (
              <p className="text-sm text-gray-400 italic text-center py-10">Sin ventas este mes</p>
            ) : (
              <div className="flex items-end gap-[3px] h-48">
                {porDia.map(d => (
                  <div key={d.dia} className="flex-1 flex flex-col items-center justify-end group relative h-full">
                    <div
                      className="w-full rounded-t bg-[#4E5B3D] hover:bg-[#42241A] transition-colors min-h-[2px]"
                      style={{ height: `${(d.total / maxDia) * 100}%` }}
                    />
                    {/* Tooltip */}
                    <div className="absolute bottom-full mb-1 hidden group-hover:block bg-[#42241A] text-white text-[10px] rounded-lg px-2 py-1 whitespace-nowrap z-10">
                      {d.dia} {MESES[m - 1].slice(0, 3)}: {money(d.total)} · {d.ventas} v
                    </div>
                    {(d.dia === 1 || d.dia % 5 === 0) && (
                      <span className="text-[9px] text-gray-400 mt-1">{d.dia}</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid lg:grid-cols-2 gap-5">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <h3 className="font-bold text-[#42241A] mb-4">Por método de pago</h3>
              <MetodoBreakdown desglose={desglose} total={totalMes} />
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <h3 className="font-bold text-[#42241A] mb-4">Productos más vendidos del mes</h3>
              <TopProductosList productos={top} />
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ─── Página principal ───────────────────────────────────────────────────────────

export default function Reportes() {
  const [tab, setTab] = useState('dia')

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-[#42241A]">Reportes</h1>
        <p className="text-sm text-gray-500 mt-0.5">Corte de caja y desempeño de ventas</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {[
          { value: 'dia', label: 'Corte del día' },
          { value: 'mes', label: 'Mensual' },
        ].map(t => (
          <button
            key={t.value}
            onClick={() => setTab(t.value)}
            className={`px-5 py-2.5 rounded-xl font-medium text-sm transition-colors min-h-[44px] ${
              tab === t.value ? 'bg-[#42241A] text-white' : 'bg-white text-[#42241A] border border-gray-100 hover:bg-gray-50'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'dia' ? <DiaTab /> : <MesTab />}
    </div>
  )
}
