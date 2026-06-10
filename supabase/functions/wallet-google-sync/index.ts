import { getAccessToken, WALLET_API } from './google.ts'

// Recibe el POST del trigger de Postgres (pg_net) cuando cambian los puntos de un cliente
// y hace PATCH del LoyaltyObject en Google Wallet. Autenticado por header secreto.
Deno.serve(async (req: Request) => {
  try {
    const secret = req.headers.get('x-webhook-secret')
    if (!secret || secret !== Deno.env.get('WALLET_SYNC_SECRET')) {
      return new Response('unauthorized', { status: 401 })
    }
    const body = await req.json()
    const objectId = body.object_id as string | undefined
    const puntos = Number(body.puntos ?? 0)
    const visitas = Number(body.visitas ?? 0)
    if (!objectId) return new Response('object_id requerido', { status: 400 })

    const SA_EMAIL = Deno.env.get('GOOGLE_SA_EMAIL')!
    const PEM = Deno.env.get('GOOGLE_SA_PRIVATE_KEY')!.replace(/\\n/g, '\n')
    const token = await getAccessToken(SA_EMAIL, PEM)

    const res = await fetch(`${WALLET_API}/loyaltyObject/${encodeURIComponent(objectId)}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        loyaltyPoints: { label: 'Puntos', balance: { int: puntos } },
        secondaryLoyaltyPoints: { label: 'Visitas', balance: { int: visitas } },
      }),
    })
    return new Response(await res.text(), { status: res.status, headers: { 'Content-Type': 'application/json' } })
  } catch (e) {
    return new Response(String((e as Error)?.message ?? e), { status: 500 })
  }
})
