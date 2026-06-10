// Crea/actualiza el LoyaltyObject de un cliente y genera el link "Save to Google Wallet".
// Uso (envs): SA_KEYFILE, ISSUER_ID, CLIENTE_ID, NOMBRE, TELEFONO, PUNTOS, VISITAS
import { loadSA, getAccessToken, signJwtRS256, WALLET_API } from './_google.mjs'

const ISSUER_ID = process.env.ISSUER_ID
const CLASS_ID = `${ISSUER_ID}.${process.env.CLASS_SUFFIX || 'soulbrew_fidelidad'}`
const { CLIENTE_ID, NOMBRE, TELEFONO } = process.env
const PUNTOS = parseInt(process.env.PUNTOS || '0', 10)
const VISITAS = parseInt(process.env.VISITAS || '0', 10)

if (!ISSUER_ID || !CLIENTE_ID) throw new Error('Falta ISSUER_ID o CLIENTE_ID')

const objectId = `${ISSUER_ID}.${CLIENTE_ID}`

const loyaltyObject = {
  id: objectId,
  classId: CLASS_ID,
  state: 'ACTIVE',
  accountName: NOMBRE,
  accountId: TELEFONO,
  loyaltyPoints: { label: 'Puntos', balance: { int: PUNTOS } },
  secondaryLoyaltyPoints: { label: 'Visitas', balance: { int: VISITAS } },
  barcode: { type: 'QR_CODE', value: TELEFONO, alternateText: TELEFONO },
}

const sa = loadSA()
const token = await getAccessToken(sa)
const url = `${WALLET_API}/loyaltyObject`
const auth = { Authorization: `Bearer ${token}` }

const getRes = await fetch(`${url}/${encodeURIComponent(objectId)}`, { headers: auth })
let res
if (getRes.status === 200) {
  res = await fetch(`${url}/${encodeURIComponent(objectId)}`, {
    method: 'PUT', headers: { ...auth, 'Content-Type': 'application/json' },
    body: JSON.stringify(loyaltyObject),
  })
  console.log(`Objeto existente → actualizado (HTTP ${res.status})`)
} else {
  res = await fetch(url, {
    method: 'POST', headers: { ...auth, 'Content-Type': 'application/json' },
    body: JSON.stringify(loyaltyObject),
  })
  console.log(`Objeto nuevo → creado (HTTP ${res.status})`)
}
const out = await res.json()
if (!res.ok) { console.error('ERROR:', JSON.stringify(out, null, 2)); process.exit(1) }

// Link "Save to Google Wallet" (JWT firmado)
const now = Math.floor(Date.now() / 1000)
const saveJwt = signJwtRS256({
  iss: sa.client_email,
  aud: 'google',
  typ: 'savetowallet',
  iat: now,
  payload: { loyaltyObjects: [{ id: objectId, classId: CLASS_ID }] },
}, sa.private_key)

console.log('OBJECT_ID:', objectId)
console.log('SAVE_URL:')
console.log('https://pay.google.com/gp/v/save/' + saveJwt)
