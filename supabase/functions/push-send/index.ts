// push-send — envía una notificación Web Push (broadcast o a un cliente por teléfono).
// Firma con VAPID (web-push, npm). verify_jwt = false: la autorización se hace en el código.
//
// Dos formas de autorizar:
//  1. Header `x-admin-secret` (server-to-server / pruebas con curl).
//  2. JWT de un usuario POS autenticado (el panel llama con la sesión del cajero).
//     Se valida contra /auth/v1/user; la anon key NO es un usuario, así que se rechaza.
import webpush from 'npm:web-push@3.6.7'

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-admin-secret' },
  })

async function usuarioAutorizado(req: Request, supabaseUrl: string, anonKey: string): Promise<boolean> {
  const authz = req.headers.get('Authorization') ?? ''
  const token = authz.replace(/^Bearer\s+/i, '')
  if (!token) return false
  // /auth/v1/user resuelve solo con un access token de usuario real (no con la anon key).
  const r = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: { apikey: anonKey, Authorization: `Bearer ${token}` },
  })
  if (!r.ok) return false
  const u = await r.json().catch(() => null)
  return Boolean(u?.id && u?.role === 'authenticated')
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-admin-secret' },
    })
  }
  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
    const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const ANON = Deno.env.get('SUPABASE_ANON_KEY')!

    const adminOk = req.headers.get('x-admin-secret') === Deno.env.get('PUSH_ADMIN_SECRET')
    const userOk = adminOk ? false : await usuarioAutorizado(req, SUPABASE_URL, ANON)
    if (!adminOk && !userOk) return new Response('unauthorized', { status: 401 })

    const { telefono, title, body: msgBody, url, debug } = await req.json().catch(() => ({}))
    if (!title && !msgBody) return json({ error: 'title o body requerido' }, 400)

    const restHeaders = { apikey: SERVICE_ROLE, Authorization: `Bearer ${SERVICE_ROLE}` }

    const pub = Deno.env.get('VAPID_PUBLIC_KEY')
    const priv = Deno.env.get('VAPID_PRIVATE_KEY')
    if (!pub || !priv) return json({ error: 'faltan secrets VAPID' }, 500)
    webpush.setVapidDetails(Deno.env.get('VAPID_SUBJECT') ?? 'mailto:soulbrew@example.com', pub, priv)

    // Destinatarios: un cliente (por teléfono) o todos.
    let query = `${SUPABASE_URL}/rest/v1/push_subscriptions?select=id,endpoint,p256dh,auth`
    const tel = String(telefono ?? '').replace(/\D/g, '')
    if (tel.length === 10) {
      const cRes = await fetch(`${SUPABASE_URL}/rest/v1/clientes?telefono=eq.${tel}&select=id`, { headers: restHeaders })
      const rows = await cRes.json()
      if (!Array.isArray(rows) || rows.length === 0) return json({ error: 'cliente no encontrado' }, 404)
      query += `&cliente_id=eq.${rows[0].id}`
    }

    const subsRes = await fetch(query, { headers: restHeaders })
    const subs = await subsRes.json()
    if (!Array.isArray(subs) || subs.length === 0) return json({ sent: 0, failed: 0, note: 'sin suscripciones' })

    const payload = JSON.stringify({ title: title ?? 'Soulbrew', body: msgBody ?? '', url: url ?? '/' })

    let sent = 0, failed = 0
    const expirados: string[] = []
    const diag: Array<Record<string, unknown>> = []
    for (const s of subs) {
      try {
        const r = await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          payload,
          { TTL: 3600, urgency: 'high' },
        )
        sent++
        if (debug) diag.push({ id: s.id, statusCode: (r as { statusCode?: number })?.statusCode })
      } catch (err) {
        failed++
        const e = err as { statusCode?: number; body?: string; message?: string }
        if (debug) diag.push({ id: s.id, error: e?.statusCode ?? e?.message, body: e?.body })
        if (e?.statusCode === 404 || e?.statusCode === 410) expirados.push(s.id)
      }
    }

    if (expirados.length > 0) {
      await fetch(`${SUPABASE_URL}/rest/v1/push_subscriptions?id=in.(${expirados.join(',')})`, {
        method: 'DELETE',
        headers: { ...restHeaders, Prefer: 'return=minimal' },
      })
    }

    return json({ sent, failed, cleaned: expirados.length, ...(debug ? { diag } : {}) })
  } catch (e) {
    return json({ error: String((e as Error)?.message ?? e) }, 500)
  }
})
