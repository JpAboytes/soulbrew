// Helpers para firmar JWT del service account y llamar a la Google Wallet API.
// Sin dependencias externas: usa node:crypto (RS256) y fetch global (Node 18+).
import { readFileSync } from 'node:fs'
import crypto from 'node:crypto'

export function loadSA(path = process.env.SA_KEYFILE) {
  if (!path) throw new Error('Falta SA_KEYFILE (ruta al JSON del service account)')
  return JSON.parse(readFileSync(path, 'utf8'))
}

const b64url = (input) => Buffer.from(input).toString('base64url')

// Firma un JWT RS256 con la private key del service account.
export function signJwtRS256(payload, privateKey, header = {}) {
  const h = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT', ...header }))
  const p = b64url(JSON.stringify(payload))
  const data = `${h}.${p}`
  const sig = crypto.sign('RSA-SHA256', Buffer.from(data), privateKey).toString('base64url')
  return `${data}.${sig}`
}

// Obtiene un access_token OAuth2 (grant jwt-bearer) para la Wallet API.
export async function getAccessToken(sa, scope = 'https://www.googleapis.com/auth/wallet_object.issuer') {
  const now = Math.floor(Date.now() / 1000)
  const assertion = signJwtRS256({
    iss: sa.client_email,
    scope,
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  }, sa.private_key)

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  })
  const json = await res.json()
  if (!res.ok) throw new Error('Error obteniendo token: ' + JSON.stringify(json))
  return json.access_token
}

export const WALLET_API = 'https://walletobjects.googleapis.com/walletobjects/v1'
