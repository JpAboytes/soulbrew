// Crea (o actualiza) el LoyaltyClass de Soulbrew en Google Wallet.
// Uso:
//   SA_KEYFILE="C:/ruta/sa.json" ISSUER_ID="..." node scripts/wallet/create-class.mjs
import { loadSA, getAccessToken, WALLET_API } from './_google.mjs'

const ISSUER_ID = process.env.ISSUER_ID
const CLASS_SUFFIX = process.env.CLASS_SUFFIX || 'soulbrew_fidelidad'
const CLASS_ID = `${ISSUER_ID}.${CLASS_SUFFIX}`
const LOGO_URL = process.env.LOGO_URL || 'https://placehold.co/300x300/2C1810/D4A853/png?text=Soulbrew'

if (!ISSUER_ID) throw new Error('Falta ISSUER_ID')

const loyaltyClass = {
  id: CLASS_ID,
  issuerName: 'Soulbrew',
  programName: 'Soulbrew Fidelidad',
  programLogo: {
    sourceUri: { uri: LOGO_URL },
    contentDescription: { defaultValue: { language: 'es-MX', value: 'Logo Soulbrew' } },
  },
  reviewStatus: 'UNDER_REVIEW',
  hexBackgroundColor: '#2C1810',
  countryCode: 'MX',
  localizedProgramName: { defaultValue: { language: 'es-MX', value: 'Soulbrew Fidelidad' } },
}

const sa = loadSA()
const token = await getAccessToken(sa)
const url = `${WALLET_API}/loyaltyClass`
const auth = { Authorization: `Bearer ${token}` }

// ¿Ya existe?
const getRes = await fetch(`${url}/${encodeURIComponent(CLASS_ID)}`, { headers: auth })

let res
if (getRes.status === 200) {
  res = await fetch(`${url}/${encodeURIComponent(CLASS_ID)}`, {
    method: 'PUT',
    headers: { ...auth, 'Content-Type': 'application/json' },
    body: JSON.stringify(loyaltyClass),
  })
  console.log(`Clase existente → actualizada (HTTP ${res.status})`)
} else {
  res = await fetch(url, {
    method: 'POST',
    headers: { ...auth, 'Content-Type': 'application/json' },
    body: JSON.stringify(loyaltyClass),
  })
  console.log(`Clase nueva → creada (HTTP ${res.status})`)
}

const out = await res.json()
if (!res.ok) {
  console.error('ERROR:', JSON.stringify(out, null, 2))
  process.exit(1)
}
console.log('CLASS_ID:', out.id)
console.log('reviewStatus:', out.reviewStatus)
