import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Plus, X, ChevronDown, ChevronUp,
  Trash2, ToggleLeft, ToggleRight, BookOpen, ImagePlus, Coffee,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import Toast from '../components/Toast'

const CATEGORIAS = ['Bebidas', 'Alimentos', 'Postres']

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function uploadProductoImage(file) {
  const ext = file.name.split('.').pop().toLowerCase()
  const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const { data, error } = await supabase.storage
    .from('productos')
    .upload(path, file, { contentType: file.type, upsert: false })
  if (error) throw error
  const { data: { publicUrl } } = supabase.storage
    .from('productos')
    .getPublicUrl(data.path)
  return publicUrl
}

// ─── Modal nuevo producto ─────────────────────────────────────────────────────

function NuevoProductoModal({ onClose, onSaved }) {
  const [form, setForm] = useState({
    nombre: '', descripcion: '', precio: '', categoria: 'Bebidas',
  })
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [loading, setLoading] = useState(false)
  const fileRef = useRef()

  function handleImageChange(e) {
    const file = e.target.files[0]
    if (!file) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)

    let imagen_url = null
    if (imageFile) {
      try {
        imagen_url = await uploadProductoImage(imageFile)
      } catch (err) {
        setLoading(false)
        alert('Error al subir la imagen: ' + err.message)
        return
      }
    }

    const { data, error } = await supabase
      .from('productos')
      .insert({
        nombre: form.nombre,
        descripcion: form.descripcion || null,
        precio: parseFloat(form.precio),
        categoria: form.categoria,
        imagen_url,
      })
      .select()
      .single()
    setLoading(false)
    if (!error) onSaved(data)
    else alert(error.message)
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 flex items-center justify-center p-6">
      <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-[#42241A]">Nuevo Producto</h2>
          <button
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center text-gray-400 hover:text-gray-600 rounded-xl"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Upload de imagen */}
          <div>
            <label className="block text-sm font-medium text-[#42241A] mb-2">Imagen del producto</label>
            <div
              onClick={() => fileRef.current.click()}
              className="cursor-pointer w-full h-36 rounded-2xl border-2 border-dashed border-gray-200 hover:border-[#4E5B3D] transition-colors overflow-hidden flex items-center justify-center bg-[#FAFAF7]"
            >
              {imagePreview ? (
                <img src={imagePreview} alt="preview" className="w-full h-full object-cover" />
              ) : (
                <div className="flex flex-col items-center gap-2 text-gray-400">
                  <ImagePlus size={28} />
                  <span className="text-sm">Toca para seleccionar imagen</span>
                  <span className="text-xs">JPG, PNG, WEBP — máx 5 MB</span>
                </div>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={handleImageChange}
              className="hidden"
            />
            {imagePreview && (
              <button
                type="button"
                onClick={() => { setImageFile(null); setImagePreview(null) }}
                className="mt-1 text-xs text-red-400 hover:text-red-600 transition-colors"
              >
                Quitar imagen
              </button>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-[#42241A] mb-1">Nombre *</label>
            <input
              value={form.nombre}
              onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
              required
              placeholder="Ej. Cappuccino"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#4E5B3D]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#42241A] mb-1">Descripción</label>
            <textarea
              value={form.descripcion}
              onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
              placeholder="Descripción breve del producto"
              rows={2}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#4E5B3D] resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-[#42241A] mb-1">Precio *</label>
              <input
                type="number" min="0" step="0.01"
                value={form.precio}
                onChange={e => setForm(f => ({ ...f, precio: e.target.value }))}
                required placeholder="0.00"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#4E5B3D]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#42241A] mb-1">Categoría *</label>
              <select
                value={form.categoria}
                onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#4E5B3D] bg-white"
              >
                {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <button
            type="submit" disabled={loading}
            className="w-full bg-[#4E5B3D] hover:bg-[#3E4A30] disabled:opacity-60 text-[#FAFAF7] font-bold py-4 rounded-xl text-base transition-colors min-h-[52px]"
          >
            {loading
              ? imageFile ? 'Subiendo imagen...' : 'Guardando...'
              : 'Crear Producto'
            }
          </button>
        </form>
      </div>
    </div>
  )
}

// ─── Panel de receta ──────────────────────────────────────────────────────────

function RecetaPanel({ producto, insumos }) {
  const [receta, setReceta] = useState([])
  const [selectedInsumo, setSelectedInsumo] = useState('')
  const [cantidad, setCantidad] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const fetchReceta = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('recetas')
      .select('*, insumos(nombre, unidad)')
      .eq('producto_id', producto.id)
      .order('id', { ascending: true })
    if (data) setReceta(data)
    setLoading(false)
  }, [producto.id])

  useEffect(() => { fetchReceta() }, [fetchReceta])

  async function addIngrediente() {
    if (!selectedInsumo || !cantidad || parseFloat(cantidad) <= 0) return
    setSaving(true)
    const { error } = await supabase.from('recetas').upsert({
      producto_id: producto.id,
      insumo_id: selectedInsumo,
      cantidad: parseFloat(cantidad),
    }, { onConflict: 'producto_id,insumo_id' })
    setSaving(false)
    if (!error) {
      setSelectedInsumo('')
      setCantidad('')
      fetchReceta()
    } else {
      alert(error.message)
    }
  }

  async function removeIngrediente(recetaId) {
    const { error } = await supabase.from('recetas').delete().eq('id', recetaId)
    if (!error) fetchReceta()
  }

  const availableInsumos = insumos.filter(i => !receta.some(r => r.insumo_id === i.id))

  return (
    <div className="mt-4 pt-4 border-t border-gray-100">
      <h4 className="text-sm font-semibold text-[#42241A] mb-3 flex items-center gap-2">
        <BookOpen size={15} className="text-[#4E5B3D]" />
        Receta / Ingredientes
      </h4>

      {loading ? (
        <div className="space-y-2">
          <div className="animate-pulse h-8 bg-gray-100 rounded-lg" />
          <div className="animate-pulse h-8 bg-gray-100 rounded-lg w-3/4" />
        </div>
      ) : (
        <>
          {receta.length === 0 ? (
            <p className="text-sm text-gray-400 italic mb-3">Sin ingredientes configurados</p>
          ) : (
            <div className="space-y-2 mb-4">
              {receta.map(r => (
                <div key={r.id} className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-2.5">
                  <span className="text-sm font-medium text-[#42241A]">{r.insumos.nombre}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-500 font-mono">
                      {Number(r.cantidad) % 1 === 0
                        ? Number(r.cantidad)
                        : Number(r.cantidad).toFixed(4).replace(/\.?0+$/, '')
                      } {r.insumos.unidad}
                    </span>
                    <button
                      onClick={() => removeIngrediente(r.id)}
                      className="text-red-300 hover:text-red-600 min-h-[36px] min-w-[36px] flex items-center justify-center transition-colors rounded-lg hover:bg-red-50"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {insumos.length === 0 ? (
            <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
              No hay insumos en el sistema. Ve a <strong>Inventario</strong> y agrega insumos primero.
            </p>
          ) : availableInsumos.length === 0 ? (
            <p className="text-xs text-[#7C5A43] bg-[#4E5B3D]/10 border border-[#4E5B3D]/20 rounded-xl px-4 py-3">
              Todos los insumos disponibles ya están en esta receta.
            </p>
          ) : (
            <div className="flex gap-2">
              <select
                value={selectedInsumo}
                onChange={e => setSelectedInsumo(e.target.value)}
                className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#4E5B3D] bg-white min-h-[44px]"
              >
                <option value="">Seleccionar insumo...</option>
                {availableInsumos.map(i => (
                  <option key={i.id} value={i.id}>{i.nombre} ({i.unidad})</option>
                ))}
              </select>
              <input
                type="number" min="0.0001" step="any"
                value={cantidad}
                onChange={e => setCantidad(e.target.value)}
                placeholder="Cant."
                onKeyDown={e => e.key === 'Enter' && addIngrediente()}
                className="w-24 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#4E5B3D] min-h-[44px]"
              />
              <button
                onClick={addIngrediente}
                disabled={saving || !selectedInsumo || !cantidad || parseFloat(cantidad) <= 0}
                className="bg-[#4E5B3D] hover:bg-[#3E4A30] disabled:opacity-50 text-[#FAFAF7] font-semibold px-4 rounded-xl text-sm transition-colors min-h-[44px] whitespace-nowrap"
              >
                {saving ? '...' : '+ Agregar'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ─── Fila de producto ─────────────────────────────────────────────────────────

function ProductoRow({ producto, insumos, onToggle, onToast, defaultExpanded }) {
  const [expanded, setExpanded] = useState(defaultExpanded ?? false)
  const [toggling, setToggling] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const fileRef = useRef()

  async function handleToggle() {
    setToggling(true)
    const { error } = await supabase
      .from('productos')
      .update({ activo: !producto.activo })
      .eq('id', producto.id)
    setToggling(false)
    if (!error) {
      onToggle()
      onToast('success', `Producto ${!producto.activo ? 'activado' : 'desactivado'}`)
    }
  }

  async function handleImageUpload(e) {
    const file = e.target.files[0]
    if (!file) return
    setUploadingImage(true)
    try {
      const publicUrl = await uploadProductoImage(file)
      const { error } = await supabase
        .from('productos')
        .update({ imagen_url: publicUrl })
        .eq('id', producto.id)
      if (error) throw error
      onToggle()
      onToast('success', 'Imagen actualizada')
    } catch (err) {
      onToast('error', 'Error al subir imagen: ' + err.message)
    } finally {
      setUploadingImage(false)
      e.target.value = ''
    }
  }

  return (
    <div className={`bg-white rounded-2xl shadow-sm border-2 transition-all ${
      expanded ? 'border-[#4E5B3D]/40' : producto.activo ? 'border-transparent' : 'border-gray-100 opacity-60'
    }`}>
      <div className="flex items-center p-4 gap-4">
        {/* Thumbnail / upload */}
        <div
          onClick={() => !uploadingImage && fileRef.current.click()}
          className="relative cursor-pointer shrink-0 w-16 h-16 rounded-xl overflow-hidden bg-[#F5F0E8] flex items-center justify-center group"
          title="Cambiar imagen"
        >
          {producto.imagen_url ? (
            <img src={producto.imagen_url} alt={producto.nombre} className="w-full h-full object-cover" />
          ) : (
            <Coffee size={22} className="text-[#4E5B3D]/50" />
          )}
          {/* Hover overlay */}
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <ImagePlus size={18} className="text-white" />
          </div>
          {/* Loading overlay */}
          {uploadingImage && (
            <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-[#4E5B3D] border-t-transparent" />
            </div>
          )}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={handleImageUpload}
          className="hidden"
        />

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-[#42241A] text-lg">{producto.nombre}</h3>
            <span className="text-xs bg-[#4E5B3D]/20 text-[#7C5A43] px-2 py-1 rounded-full font-medium">
              {producto.categoria}
            </span>
            {!producto.activo && (
              <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded-full font-medium">
                Inactivo
              </span>
            )}
          </div>
          {producto.descripcion && (
            <p className="text-sm text-gray-500 mt-0.5 truncate">{producto.descripcion}</p>
          )}
          <p className="text-xl font-bold text-[#4E5B3D] mt-1">${Number(producto.precio).toFixed(2)}</p>
        </div>

        {/* Acciones */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={handleToggle}
            disabled={toggling}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center transition-colors"
            title={producto.activo ? 'Desactivar' : 'Activar'}
          >
            {producto.activo
              ? <ToggleRight size={28} className="text-green-500" />
              : <ToggleLeft size={28} className="text-gray-300" />
            }
          </button>
          <button
            onClick={() => setExpanded(v => !v)}
            className={`min-h-[44px] min-w-[44px] flex items-center justify-center transition-colors rounded-xl ${
              expanded ? 'bg-[#4E5B3D]/10 text-[#42241A]' : 'text-gray-400 hover:text-[#42241A]'
            }`}
            title="Ver receta"
          >
            {expanded ? <ChevronUp size={22} /> : <ChevronDown size={22} />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="px-5 pb-5">
          <RecetaPanel producto={producto} insumos={insumos} />
        </div>
      )}
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function Productos() {
  const [productos, setProductos] = useState([])
  const [insumos, setInsumos] = useState([])
  const [loading, setLoading] = useState(true)
  const [showNuevo, setShowNuevo] = useState(false)
  const [categoriaFiltro, setCategoriaFiltro] = useState('Todos')
  const [toast, setToast] = useState(null)
  const [expandedId, setExpandedId] = useState(null)

  const fetchData = useCallback(async () => {
    const [{ data: prods }, { data: ins }] = await Promise.all([
      supabase.from('productos').select('*').order('nombre'),
      supabase.from('insumos').select('id, nombre, unidad').order('nombre'),
    ])
    if (prods) setProductos(prods)
    if (ins) setInsumos(ins)
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const filteredProductos = categoriaFiltro === 'Todos'
    ? productos
    : productos.filter(p => p.categoria === categoriaFiltro)

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[#42241A]">Productos</h1>
        <button
          onClick={() => setShowNuevo(true)}
          className="flex items-center gap-2 bg-[#42241A] hover:bg-[#5C3A28] text-white font-semibold px-5 py-3 rounded-xl transition-colors min-h-[48px]"
        >
          <Plus size={20} />
          Nuevo Producto
        </button>
      </div>

      <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
        {['Todos', ...CATEGORIAS].map(cat => (
          <button
            key={cat}
            onClick={() => setCategoriaFiltro(cat)}
            className={`px-4 py-2 rounded-xl font-medium text-sm whitespace-nowrap transition-colors min-h-[44px] ${
              categoriaFiltro === cat
                ? 'bg-[#42241A] text-white'
                : 'bg-white text-[#42241A] hover:bg-gray-100'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#4E5B3D] border-t-transparent" />
        </div>
      ) : filteredProductos.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-lg">No hay productos</p>
          <p className="text-sm mt-1">
            {categoriaFiltro !== 'Todos' ? 'Prueba con otra categoría' : 'Crea el primer producto'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredProductos.map(producto => (
            <ProductoRow
              key={producto.id}
              producto={producto}
              insumos={insumos}
              onToggle={fetchData}
              onToast={(type, text) => setToast({ type, text })}
              defaultExpanded={producto.id === expandedId}
            />
          ))}
        </div>
      )}

      {showNuevo && (
        <NuevoProductoModal
          onClose={() => setShowNuevo(false)}
          onSaved={async (nuevoProducto) => {
            setShowNuevo(false)
            setExpandedId(nuevoProducto.id)
            await fetchData()
            setToast({ type: 'success', text: `"${nuevoProducto.nombre}" creado — agrega su receta abajo` })
          }}
        />
      )}

      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </div>
  )
}
