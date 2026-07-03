// push-send — envía una notificación Web Push (broadcast o a un cliente por teléfono).
// Protegida por header secreto `x-admin-secret` (server-to-server / pruebas). En una fase
// futura, el panel del POS la llamará a través de una función autenticada por JWT.
//
// verify_jwt = false: usa su propio secreto. Firma con VAPID (web-push, npm).
import webpush from 'npm:web-push@3.6.7'

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

Deno.serve(async (req: Request) => {
  try {
    if (req.headers.get('x-admin-secret') !== Deno.env.get('PUSH_ADMIN_SECRET')) {
      return new Response('unauthorized', { status: 401 })
    }

    const { telefono, title, body: msgBody, url } = await req.json().catch(() => ({}))
    if (!title && !msgBody) return json({ error: 'title o body requerido' }, 400)

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
    const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const restHeaders = { apikey: SERVICE_ROLE, Authorization: `Bearer ${SERVICE_ROLE}` }

    webpush.setVapidDetails(
      Deno.env.get('VAPID_SUBJECT') ?? 'mailto:soulbrew@example.com',
      Deno.env.get('VAPID_PUBLIC_KEY')!,
      Deno.env.get('VAPID_PRIVATE_KEY')!,
    )

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
    for (const s of subs) {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          payload,
        )
        sent++
      } catch (err) {
        failed++
        const code = (err as { statusCode?: number })?.statusCode
        if (code === 404 || code === 410) expirados.push(s.id) // suscripción muerta
      }
    }

    // Limpia las suscripciones expiradas.
    if (expirados.length > 0) {
      await fetch(`${SUPABASE_URL}/rest/v1/push_subscriptions?id=in.(${expirados.join(',')})`, {
        method: 'DELETE',
        headers: { ...restHeaders, Prefer: 'return=minimal' },
      })
    }

    return json({ sent, failed, cleaned: expirados.length })
  } catch (e) {
    return json({ error: String((e as Error)?.message ?? e) }, 500)
  }
})
