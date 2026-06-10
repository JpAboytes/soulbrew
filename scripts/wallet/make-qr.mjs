// Regenera el save link de un cliente y escribe un HTML local con QR + botón.
// El QR se renderiza en el navegador (CDN), el token no se envía a terceros.
// Uso (envs): SA_KEYFILE, ISSUER_ID, CLIENTE_ID, CLASS_SUFFIX?
import { writeFileSync } from 'node:fs'
import { loadSA, signJwtRS256 } from './_google.mjs'

const ISSUER_ID = process.env.ISSUER_ID
const CLASS_ID = `${ISSUER_ID}.${process.env.CLASS_SUFFIX || 'soulbrew_fidelidad'}`
const CLIENTE_ID = process.env.CLIENTE_ID
if (!ISSUER_ID || !CLIENTE_ID) throw new Error('Falta ISSUER_ID o CLIENTE_ID')

const objectId = `${ISSUER_ID}.${CLIENTE_ID}`
const sa = loadSA()
const now = Math.floor(Date.now() / 1000)
const jwt = signJwtRS256({
  iss: sa.client_email,
  aud: 'google',
  typ: 'savetowallet',
  iat: now,
  payload: { loyaltyObjects: [{ id: objectId, classId: CLASS_ID }] },
}, sa.private_key)

const url = 'https://pay.google.com/gp/v/save/' + jwt

const html = `<!doctype html><html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Soulbrew — Agregar a Google Wallet</title>
<style>
  body{font-family:system-ui,sans-serif;background:#2C1810;color:#FAFAF7;margin:0;
       min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:24px;padding:24px}
  h1{color:#D4A853;margin:0}
  .card{background:#FAFAF7;color:#2C1810;border-radius:24px;padding:28px;text-align:center;max-width:360px}
  #qr{display:flex;justify-content:center;margin:16px 0}
  a.btn{display:inline-block;background:#D4A853;color:#2C1810;font-weight:700;text-decoration:none;
        padding:14px 24px;border-radius:14px;margin-top:8px}
  p{font-size:14px;color:#5C3317}
</style></head><body>
  <h1>Soulbrew · Fidelización</h1>
  <div class="card">
    <p><strong>Escanea este QR con tu teléfono Android</strong> para agregar la tarjeta a Google Wallet.</p>
    <div id="qr"></div>
    <p>O en el mismo teléfono:</p>
    <a class="btn" href="${url}">Agregar a Google Wallet</a>
  </div>
  <script src="https://cdn.jsdelivr.net/gh/davidshimjs/qrcodejs/qrcode.min.js"></script>
  <script>new QRCode(document.getElementById('qr'), { text: ${JSON.stringify(url)}, width: 240, height: 240 });</script>
</body></html>`

const out = new URL('./save-link.html', import.meta.url)
writeFileSync(out, html)
console.log('HTML escrito en:', out.pathname)
