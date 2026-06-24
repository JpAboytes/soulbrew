// Lógica de fidelización compartida entre el POS y la app de cliente.
// Sin dependencias de UI: los componentes mapean `nivel` a su propio ícono.

export const PUNTOS_POR_PESO = 1          // 1 punto por cada $1 del total sin descuento
export const PUNTOS_POR_TIER = 100         // cada 100 pts = un tier / una recompensa
export const PESOS_POR_TIER = 10           // 100 pts canjeables = $10 de descuento
export const NIVEL_RECOMPENSA = 100        // a partir de aquí hay recompensa disponible
export const NIVEL_VIP = 300               // a partir de aquí el cliente es VIP

// Descuento en pesos por una cantidad de puntos a canjear (múltiplos de 100).
export function puntosADescuento(puntos) {
  return Math.floor(puntos / PUNTOS_POR_TIER) * PESOS_POR_TIER
}

// Máximo de puntos canjeables (redondeado a múltiplos de 100).
export function maxCanjeable(puntos) {
  return Math.floor(puntos / PUNTOS_POR_TIER) * PUNTOS_POR_TIER
}

// Nivel del cliente para la tarjeta pública. Devuelve datos sin UI.
export function getNivel(puntos) {
  if (puntos >= NIVEL_VIP) {
    return { nivel: 'vip', msg: '¡Cliente VIP! Gracias por tu preferencia', color: '#D4A853' }
  }
  if (puntos >= NIVEL_RECOMPENSA) {
    return { nivel: 'recompensa', msg: '¡Ya tienes una recompensa disponible!', color: '#22c55e' }
  }
  return { nivel: 'inicio', msg: '¡Estás empezando tu aventura!', color: '#8B5A3C' }
}
