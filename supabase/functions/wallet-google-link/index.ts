import { signJwt, getAccessToken, WALLET_API } from './google.ts'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

// Nivel del cliente para la tarjeta (mismos umbrales que @soulbrew/core: 100 / 300).
const nivel = (puntos: number) =>
  puntos >= 300 ? 'VIP' : puntos >= 100 ? 'Recompensa' : 'Inicio'

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    const { telefono } = await req.json()
    if (!telefono) return json({ error: 'telefono requerido' }, 400)

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
    const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const ISSUER_ID = Deno.env.get('GOOGLE_WALLET_ISSUER_ID')!
    const CLASS_ID = Deno.env.get('GOOGLE_WALLET_CLASS_ID')!
    const SA_EMAIL = Deno.env.get('GOOGLE_SA_EMAIL')!
    const PEM = Deno.env.get('GOOGLE_SA_PRIVATE_KEY')!.replace(/\\n/g, '\n')

    // Buscar cliente por telefono (service role)
    const cRes = await fetch(
      `${SUPABASE_URL}/rest/v1/clientes?telefono=eq.${encodeURIComponent(telefono)}&select=id,nombre,telefono,puntos_acumulados,visitas,wallet_object_id`,
      { headers: { apikey: SERVICE_ROLE, Authorization: `Bearer ${SERVICE_ROLE}` } },
    )
    const rows = await cRes.json()
    if (!Array.isArray(rows) || rows.length === 0) return json({ error: 'cliente no encontrado' }, 404)
    const cliente = rows[0]
    const objectId = `${ISSUER_ID}.${cliente.id}`

    const token = await getAccessToken(SA_EMAIL, PEM)
    const obj = {
      id: objectId, classId: CLASS_ID, state: 'ACTIVE',
      accountName: cliente.nombre, accountId: cliente.telefono,
      loyaltyPoints: { label: 'Puntos', balance: { int: cliente.puntos_acumulados ?? 0 } },
      secondaryLoyaltyPoints: { label: 'Visitas', balance: { int: cliente.visitas ?? 0 } },
      rewardsTier: nivel(cliente.puntos_acumulados ?? 0),
      barcode: { type: 'QR_CODE', value: cliente.telefono, alternateText: cliente.telefono },
    }
    const base = `${WALLET_API}/loyaltyObject`
    const g = await fetch(`${base}/${encodeURIComponent(objectId)}`, { headers: { Authorization: `Bearer ${token}` } })
    if (g.status === 200) {
      await fetch(`${base}/${encodeURIComponent(objectId)}`, {
        method: 'PUT', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(obj),
      })
    } else {
      const created = await fetch(base, {
        method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(obj),
      })
      if (!created.ok) return json({ error: 'no se pudo crear el objeto', detail: await created.text() }, 500)
    }

    if (!cliente.wallet_object_id) {
      await fetch(`${SUPABASE_URL}/rest/v1/clientes?id=eq.${cliente.id}`, {
        method: 'PATCH',
        headers: { apikey: SERVICE_ROLE, Authorization: `Bearer ${SERVICE_ROLE}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
        body: JSON.stringify({ wallet_object_id: objectId }),
      })
    }

    const saveJwt = await signJwt({
      iss: SA_EMAIL, aud: 'google', typ: 'savetowallet', iat: Math.floor(Date.now() / 1000),
      payload: { loyaltyObjects: [{ id: objectId, classId: CLASS_ID }] },
    }, PEM)

    return json({ saveUrl: 'https://pay.google.com/gp/v/save/' + saveJwt, objectId })
  } catch (e) {
    return json({ error: String((e as Error)?.message ?? e) }, 500)
  }
})
