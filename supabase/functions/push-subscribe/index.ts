// push-subscribe — guarda la suscripción de Web Push de un cliente (service_role).
// La app pública no tiene INSERT en push_subscriptions (RLS sin policies anon), por eso
// pasa por aquí. Liga con el cliente por teléfono cuando se provee. Idempotente por endpoint.
//
// verify_jwt = true: se invoca con la anon key del front (JWT válido), igual que cliente-registro.

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    const body = await req.json().catch(() => ({}))
    const sub = body?.subscription
    const endpoint = sub?.endpoint
    const p256dh = sub?.keys?.p256dh
    const auth = sub?.keys?.auth
    const userAgent = body?.userAgent ?? null
    const telefono = String(body?.telefono ?? '').replace(/\D/g, '')

    if (!endpoint || !p256dh || !auth) return json({ error: 'suscripción inválida' }, 400)

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
    const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const headers = {
      apikey: SERVICE_ROLE,
      Authorization: `Bearer ${SERVICE_ROLE}`,
      'Content-Type': 'application/json',
    }

    // Ligar con el cliente por teléfono (opcional).
    let cliente_id: string | null = null
    if (telefono.length === 10) {
      const cRes = await fetch(
        `${SUPABASE_URL}/rest/v1/clientes?telefono=eq.${telefono}&select=id`,
        { headers },
      )
      const rows = await cRes.json()
      if (Array.isArray(rows) && rows.length > 0) cliente_id = rows[0].id
    }

    // Upsert por endpoint (único): si el dispositivo ya estaba, actualiza llaves/cliente.
    const upRes = await fetch(
      `${SUPABASE_URL}/rest/v1/push_subscriptions?on_conflict=endpoint`,
      {
        method: 'POST',
        headers: { ...headers, Prefer: 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify({
          endpoint, p256dh, auth, user_agent: userAgent, cliente_id, updated_at: new Date().toISOString(),
        }),
      },
    )
    if (!upRes.ok) {
      return json({ error: 'no se pudo guardar la suscripción', detail: await upRes.text() }, 500)
    }

    return json({ ok: true, linked: Boolean(cliente_id) })
  } catch (e) {
    return json({ error: String((e as Error)?.message ?? e) }, 500)
  }
})
