import { createClient } from '@supabase/supabase-js'

// Factory del cliente Supabase. Cada app (POS / cliente) lo invoca con sus propias
// variables de entorno (import.meta.env.VITE_*), de modo que la resolución de env
// ocurre en el código de la app y no dentro de este paquete compartido.
export function createSupabaseClient(url, anonKey) {
  if (!url || !anonKey) {
    throw new Error('createSupabaseClient: faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY')
  }
  return createClient(url, anonKey)
}
