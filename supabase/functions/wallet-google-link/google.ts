// Helpers para firmar JWT del service account y llamar a la Google Wallet API (Deno / Web Crypto).

function pemToBuf(pem: string): ArrayBuffer {
  const b64 = pem.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '')
  const bin = atob(b64)
  const buf = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i)
  return buf.buffer
}

async function importKey(pem: string): Promise<CryptoKey> {
  return await crypto.subtle.importKey(
    'pkcs8', pemToBuf(pem),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false, ['sign'],
  )
}

function b64urlBytes(bytes: Uint8Array): string {
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
const b64urlStr = (s: string) => b64urlBytes(new TextEncoder().encode(s))

export async function signJwt(payload: Record<string, unknown>, pem: string, header: Record<string, unknown> = {}): Promise<string> {
  const key = await importKey(pem)
  const h = b64urlStr(JSON.stringify({ alg: 'RS256', typ: 'JWT', ...header }))
  const p = b64urlStr(JSON.stringify(payload))
  const data = `${h}.${p}`
  const sig = new Uint8Array(await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(data)))
  return `${data}.${b64urlBytes(sig)}`
}

export async function getAccessToken(saEmail: string, pem: string, scope = 'https://www.googleapis.com/auth/wallet_object.issuer'): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  const assertion = await signJwt({ iss: saEmail, scope, aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 }, pem)
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }),
  })
  const j = await res.json()
  if (!res.ok) throw new Error('token error: ' + JSON.stringify(j))
  return j.access_token as string
}

export const WALLET_API = 'https://walletobjects.googleapis.com/walletobjects/v1'
