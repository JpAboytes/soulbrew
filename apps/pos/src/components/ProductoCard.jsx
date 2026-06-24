import { Coffee } from 'lucide-react'

export default function ProductoCard({ producto, onAdd }) {
  return (
    <button
      onClick={() => onAdd(producto)}
      className="bg-white rounded-2xl overflow-hidden shadow-sm border-2 border-transparent hover:border-[#D4A853] active:scale-95 transition-all text-left w-full flex flex-col"
    >
      {/* Imagen o placeholder */}
      <div className="w-full h-28 bg-[#F5F0E8] flex items-center justify-center overflow-hidden shrink-0">
        {producto.imagen_url ? (
          <img
            src={producto.imagen_url}
            alt={producto.nombre}
            className="w-full h-full object-cover"
          />
        ) : (
          <Coffee size={32} className="text-[#D4A853]/50" />
        )}
      </div>

      {/* Info */}
      <div className="p-4 flex flex-col flex-1 justify-between">
        <div>
          <span className="text-xs text-[#8B5A3C] font-medium uppercase tracking-wide">
            {producto.categoria}
          </span>
          <h3 className="font-semibold text-[#2C1810] text-base mt-1 leading-tight">
            {producto.nombre}
          </h3>
          {producto.descripcion && (
            <p className="text-sm text-gray-500 mt-1 line-clamp-2">{producto.descripcion}</p>
          )}
        </div>
        <p className="text-xl font-bold text-[#D4A853] mt-3">
          ${Number(producto.precio).toFixed(2)}
        </p>
      </div>
    </button>
  )
}
