import { RotateCcw } from 'lucide-react'

export default function InsumoCard({ insumo, onRestock }) {
  const isCritical = insumo.stock_actual <= insumo.stock_minimo
  const isLow = !isCritical && insumo.stock_actual <= insumo.stock_minimo * 1.5

  return (
    <div
      className={`bg-white rounded-2xl p-5 shadow-sm border-2 transition-all ${
        isCritical ? 'border-red-200' : isLow ? 'border-yellow-200' : 'border-transparent'
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <h3 className="font-semibold text-[#2C1810] text-lg leading-tight">{insumo.nombre}</h3>
        <div className="flex gap-2 items-center shrink-0 ml-2">
          {isCritical && (
            <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-1 rounded-full uppercase tracking-wide">
              Crítico
            </span>
          )}
          {isLow && (
            <span className="bg-yellow-100 text-yellow-700 text-xs font-bold px-2 py-1 rounded-full uppercase tracking-wide">
              Bajo
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <p className="text-xs text-gray-500 mb-1">Stock actual</p>
          <p className={`text-2xl font-bold ${isCritical ? 'text-red-600' : 'text-[#2C1810]'}`}>
            {Number(insumo.stock_actual).toFixed(2)}
          </p>
          <p className="text-xs text-gray-400">{insumo.unidad}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1">Stock mínimo</p>
          <p className="text-2xl font-bold text-gray-300">
            {Number(insumo.stock_minimo).toFixed(2)}
          </p>
          <p className="text-xs text-gray-400">{insumo.unidad}</p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          Costo:{' '}
          <span className="font-medium text-[#2C1810]">
            ${Number(insumo.costo_unitario).toFixed(2)}/{insumo.unidad}
          </span>
        </p>
        <button
          onClick={() => onRestock(insumo)}
          className="flex items-center gap-2 bg-[#D4A853] hover:bg-[#c49843] text-[#2C1810] font-semibold px-4 py-2 rounded-xl transition-colors min-h-[44px]"
        >
          <RotateCcw size={16} />
          Restock
        </button>
      </div>
    </div>
  )
}
