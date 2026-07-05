// Extrae el mensaje real de una Edge Function para mostrarlo al usuario.
// `supabase.functions.invoke` ante un status !2xx devuelve un FunctionsHttpError cuyo
// `.message` es genérico en inglés ("Edge Function returned a non-2xx status code"); el
// detalle útil (p. ej. "El teléfono debe tener 10 dígitos.") viaja en el body de la
// respuesta, accesible vía `err.context` (que es el objeto Response).
export async function mensajeFnError(err, fallback = 'Algo salió mal. Intenta de nuevo.') {
  try {
    const body = await err?.context?.json?.()
    if (body?.error) return body.error
  } catch { /* body no-JSON o ya consumido */ }
  return err?.message && !/non-2xx/i.test(err.message) ? err.message : fallback
}
