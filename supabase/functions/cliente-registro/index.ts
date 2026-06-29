// cliente-registro — alta pública al programa de fidelización desde apps/cliente.
// Usa el service_role (solo en el servidor) para insertar en `clientes`, ya que la
// anon key no tiene permiso de INSERT. Valida nombre + teléfono (10 dígitos) y evita
// duplicados: si el teléfono ya existe, devuelve ese cliente con `yaExistia: true`.
//
// verify_jwt = true: se invoca con la anon key del front (un JWT válido del proyecto),
// igual que wallet-google-link.

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

const SELECT = 'id,nombre,telefono,puntos_acumulados,visitas,wallet_object_id,created_at'

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    const body = await req.json().catch(() => ({}))
    const nombre = String(body?.nombre ?? '').trim()
    // El front manda solo dígitos, pero saneamos por si acaso.
    const telefono = String(body?.telefono ?? '').replace(/\D/g, '')

    if (nombre.length < 2) return json({ error: 'Escribe tu nombre.' }, 400)
    if (telefono.length !== 10) return json({ error: 'El teléfono debe tener 10 dígitos.' }, 400)

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
    const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const headers = {
      apikey: SERVICE_ROLE,
      Authorization: `Bearer ${SERVICE_ROLE}`,
      'Content-Type': 'application/json',
    }

    // ¿Ya está registrado este teléfono?
    const existRes = await fetch(
      `${SUPABASE_URL}/rest/v1/clientes?telefono=eq.${telefono}&select=${SELECT}`,
      { headers },
    )
    const existing = await existRes.json()
    if (Array.isArray(existing) && existing.length > 0) {
      return json({ cliente: existing[0], yaExistia: true })
    }

    // Alta del cliente.
    const insRes = await fetch(`${SUPABASE_URL}/rest/v1/clientes`, {
      method: 'POST',
      headers: { ...headers, Prefer: 'return=representation' },
      body: JSON.stringify({ nombre, telefono }),
    })
    const inserted = await insRes.json()
    if (!insRes.ok || !Array.isArray(inserted) || inserted.length === 0) {
      // 23505 = unique_violation (carrera contra otra alta del mismo teléfono).
      if (insRes.status === 409 || inserted?.code === '23505') {
        const retry = await fetch(
          `${SUPABASE_URL}/rest/v1/clientes?telefono=eq.${telefono}&select=${SELECT}`,
          { headers },
        )
        const rows = await retry.json()
        if (Array.isArray(rows) && rows.length > 0) return json({ cliente: rows[0], yaExistia: true })
      }
      return json({ error: 'No se pudo crear tu tarjeta. Intenta de nuevo.', detail: inserted }, 500)
    }

    return json({ cliente: inserted[0], yaExistia: false })
  } catch (e) {
    return json({ error: String((e as Error)?.message ?? e) }, 500)
  }
})
