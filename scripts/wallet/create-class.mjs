// Crea (o actualiza) el LoyaltyClass de Soulbrew en Google Wallet.
// Uso:
//   SA_KEYFILE="C:/ruta/sa.json" ISSUER_ID="..." node scripts/wallet/create-class.mjs
import { loadSA, getAccessToken, WALLET_API } from './_google.mjs'

const ISSUER_ID = process.env.ISSUER_ID
const CLASS_SUFFIX = process.env.CLASS_SUFFIX || 'soulbrew_fidelidad'
const CLASS_ID = `${ISSUER_ID}.${CLASS_SUFFIX}`
// Logo cuadrado de marca (wordmark sobre espresso), servido desde el dominio del cliente.
const LOGO_URL = process.env.LOGO_URL || 'https://soulbrew-cliente.vercel.app/wallet-logo.png'
const MENU_URL = process.env.MENU_URL || 'https://soulbrew-cliente.vercel.app/'
const INSTAGRAM_URL = process.env.INSTAGRAM_URL || 'https://instagram.com/soulbrewmxl'

if (!ISSUER_ID) throw new Error('Falta ISSUER_ID')

const es = (value) => ({ defaultValue: { language: 'es-MX', value } })

const loyaltyClass = {
  id: CLASS_ID,
  issuerName: 'Soulbrew',
  programName: 'Soulbrew Fidelidad',
  localizedProgramName: es('Soulbrew Fidelidad'),
  programLogo: {
    sourceUri: { uri: LOGO_URL },
    contentDescription: es('Logo Soulbrew'),
  },
  reviewStatus: 'UNDER_REVIEW',
  // Paleta de marca (rebrand): café espresso del logo.
  hexBackgroundColor: '#42241A',
  countryCode: 'MX',

  // Etiquetas de los campos por cliente (LoyaltyObject).
  accountNameLabel: 'Cliente',
  accountIdLabel: 'Teléfono',
  rewardsTierLabel: 'Nivel',

  // Detalle del programa (visible al expandir la tarjeta).
  textModulesData: [
    {
      id: 'como_funciona',
      header: 'Cómo funciona',
      body: 'Gana 1 punto por cada $1 que gastes. Junta 100 puntos y canjéalos por $10 de descuento en tu próxima visita. Presenta tu tarjeta en caja.',
    },
    {
      id: 'niveles',
      header: 'Niveles',
      body: 'Inicio · Recompensa a partir de 100 pts · VIP a partir de 300 pts.',
    },
  ],

  // Links externos.
  linksModuleData: {
    uris: [
      { id: 'menu', uri: MENU_URL, description: 'Ver el menú' },
      { id: 'instagram', uri: INSTAGRAM_URL, description: 'Síguenos en Instagram' },
    ],
  },
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
