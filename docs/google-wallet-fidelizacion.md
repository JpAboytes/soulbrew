# Plan: Tarjeta de fidelización en Google Wallet

> **Estado:** ✅ Funcionando y validado end-to-end (link + sincronización automática de puntos).
> Decisiones tomadas: **solo Google Wallet** (Apple en fase futura), **construido por nosotros**
> (sin servicio gestionado), backend en **Supabase Edge Functions** (proyecto `euoltfaqmmshagxsosrc`).

## Valores resueltos (no son secretos)

- **Issuer ID:** `3388000000023139240` (cuenta "JuanPabloAboytes")
- **Class ID:** `3388000000023139240.soulbrew_fidelidad` (creada y aprobada)
- **Service account:** `soulbrew@soulbrew.iam.gserviceaccount.com` (project `soulbrew`)
- **JSON de la llave:** `C:\Users\Hp\Downloads\soulbrew-93a6d80b74c0.json` (local, NO se versiona)
- **Scripts de setup local:** `scripts/wallet/` (`create-class.mjs`, `create-save-link.mjs`, `_google.mjs`)

### Progreso
- [x] Service account autorizado + Wallet API habilitada
- [x] LoyaltyClass creada (`scripts/wallet/create-class.mjs`)
- [x] Columna `clientes.wallet_object_id` (migración `clientes_wallet_object_id`)
- [x] LoyaltyObject + save link validados de punta a punta (Ana López)
- [x] Edge Functions `wallet-google-link` (verify_jwt) / `wallet-google-sync` (secreto)
- [x] Trigger `wallet_sync` en `clientes` + `pg_net` (migración `wallet_sync_trigger`)
- [x] Botón "Agregar a Google Wallet" en `FidelidadPublica.jsx`
- [x] Secrets en Supabase
- [x] **Validado end-to-end:** `wallet-google-link` devuelve saveUrl; cambiar puntos en BD
      sincroniza el LoyaltyObject en Google en segundos.

### Diseño de la tarjeta (LoyaltyClass) — actualizado
La clase se rediseñó con la marca (rebrand): fondo **espresso `#42241A`**, **logo real**
(`wallet-logo.png`: wordmark sobre espresso, 660×660, servido desde
`https://soulbrew-cliente.vercel.app/wallet-logo.png`), etiquetas *Cliente* / *Teléfono* /
*Nivel*, módulos de texto **"Cómo funciona"** y **"Niveles"**, y links a **menú** e
**Instagram** (`@soulbrewmxl`). El objeto (`wallet-google-link`) incluye `rewardsTier`
(Inicio / Recompensa 100+ / VIP 300+), y `wallet-google-sync` lo recalcula al cambiar los
puntos. Todo en `scripts/wallet/create-class.mjs` (env opcionales: `LOGO_URL`, `MENU_URL`,
`INSTAGRAM_URL`). Re-aplicar con:
`SA_KEYFILE=... ISSUER_ID=3388000000023139240 node scripts/wallet/create-class.mjs`

### Pendientes menores (no bloqueantes)
- **Quitar el banner "[SOLO PARA PRUEBAS]" / "[TEST ONLY]"**: aparece porque el issuer
  está en **modo demo**. Se resuelve pidiendo **acceso de publicación** en Google Pay &
  Wallet Console → *Business profile* → *Request publishing access* (completar el perfil de
  negocio). Una vez aprobado, los pases existentes pierden el banner. Es un paso **manual**,
  no de código.
- Usar el botón/asset oficial "Add to Google Wallet" (branding de Google) en vez del botón estilizado.
- (Opcional) Hero/banner con foto real de la cafetería: tubería lista
  (`scripts/wallet/make-hero.py` + `USE_HERO=1` en `create-class.mjs`); falta la foto.

> **Logo:** se usa `wallet-logo-v2.png` (wordmark al 8% de margen, llena mejor el círculo).
> El logo se genera con `scripts/wallet/make-logo.py`. Google cachea imágenes por URL, así
> que al cambiar el logo hay que **versionar el nombre** (v2, v3, …), no sobrescribir.

### Secrets a cargar (Dashboard → Project Settings → Edge Functions → Secrets)
| Secret | Valor |
|---|---|
| `GOOGLE_SA_EMAIL` | `soulbrew@soulbrew.iam.gserviceaccount.com` |
| `GOOGLE_SA_PRIVATE_KEY` | el campo `private_key` del JSON (incluye los `\n`) |
| `GOOGLE_WALLET_ISSUER_ID` | `3388000000023139240` |
| `GOOGLE_WALLET_CLASS_ID` | `3388000000023139240.soulbrew_fidelidad` |
| `WALLET_SYNC_SECRET` | _(secreto generado; mismo valor en el trigger `wallet_sync` y en los secrets de Supabase)_ |

> `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` ya están disponibles en las Edge Functions
> automáticamente; no hay que cargarlos.

## Contexto

Soulbrew ya tiene un programa de fidelización (tablas `clientes` + `puntos_historial`,
página pública `/fidelidad/:telefono` en `src/pages/FidelidadPublica.jsx`, y acumulación
de puntos desde el POS y ajustes manuales). Hoy el cliente solo puede ver su tarjeta
abriendo una URL con su teléfono. Queremos que pueda **guardar la tarjeta en Google Wallet**
para traerla siempre en el celular, con sus **puntos actualizándose automáticamente** cada
vez que cambian en la base.

Por qué Google Wallet encaja bien: el botón "Add" es un **JWT firmado** (no requiere backend
para guardarse) y actualizar puntos es un simple `PATCH` REST que el wallet refleja solo.
El issuer es gratis (no requiere cuenta de pago como Apple).

## Prerrequisitos (manuales, los hace el usuario una vez)

1. Proyecto en **Google Cloud**; habilitar la **Google Wallet API**.
2. Crear un **service account** + descargar su **JSON key** (contiene `client_email` y `private_key`).
3. Registrarse como issuer en **Google Pay & Wallet Console** → obtener el **Issuer ID**.
4. En la Wallet Console, autorizar el service account (darle acceso al issuer).
5. (Una sola vez) Crear el **LoyaltyClass** — desde la función de setup (abajo) o desde la
   consola. Class ID = `{ISSUER_ID}.soulbrew_fidelidad`.

## Diseño de la tarjeta (LoyaltyClass / LoyaltyObject)

- **Class** (plantilla del programa, 1 sola): nombre "Soulbrew", logo, colores de marca
  `#2C1810`/`#D4A853`, etiqueta de puntos "Puntos", y textos del programa (100 pts = $10, etc.).
  Reutiliza la paleta ya usada en `FidelidadPublica.jsx`.
- **Object** (1 por cliente): `id = {ISSUER_ID}.{cliente.id}` (el uuid de `clientes.id` es
  estable y válido para object IDs de Google). Campos:
  - `loyaltyPoints.balance.int` = `puntos_acumulados`
  - `accountName` = `cliente.nombre`, `accountId` = `cliente.telefono`
  - `barcode` tipo QR con valor = `cliente.telefono`
  - `secondaryLoyaltyPoints` (opcional) = `visitas`
- **Sinergia con el POS:** el código de barras lleva el `telefono`, que es exactamente lo que
  `src/pages/Vender.jsx` usa para buscar cliente. Escanear la tarjeta del wallet en caja puede
  autollenar el cliente (mejora futura, no parte de este plan).

## Cambios en la base de datos (migración vía MCP `apply_migration`)

1. `alter table public.clientes add column wallet_object_id text;`
   - Se setea cuando el cliente genera/agrega su tarjeta. Sirve para saber a quién hay que
     sincronizar (no creamos objetos en Google para clientes que nunca agregaron la tarjeta).
2. **Database Webhook** (Dashboard → Database → Webhooks, o trigger SQL con `pg_net`): on
   `UPDATE` de `public.clientes`, si cambió `puntos_acumulados` y `wallet_object_id is not null`,
   hace POST a la edge function `wallet-google-sync` con la fila. Incluir header secreto
   (`x-webhook-secret`) para autenticarla.

## Edge Functions (Deno) — carpeta `supabase/functions/`, deploy vía MCP `deploy_edge_function`

Helper compartido `_shared/google.ts`:
- Firma RS256 con **Web Crypto** (importa el `private_key` PKCS8 del SA) — sin dependencias
  pesadas; o usa `djwt` (`deno.land/x/djwt`).
- `getAccessToken()`: arma un JWT assertion (scope
  `https://www.googleapis.com/auth/wallet_object.issuer`) y lo cambia por un access_token en
  `https://oauth2.googleapis.com/token` (grant `jwt-bearer`).

1. **`wallet-google-link`** (pública / invocable con anon desde el front)
   - Input: `{ telefono }`.
   - Busca el cliente (service role). Si no existe → 404.
   - Crea el LoyaltyObject vía REST si no existe (`POST .../loyaltyObject`), guarda
     `wallet_object_id` en `clientes`.
   - Construye el **"Save to Google Wallet" JWT** (RS256, `typ: savetowallet`, payload con el
     loyaltyObject/clase) y devuelve `https://pay.google.com/gp/v/save/{jwt}`.

2. **`wallet-google-sync`** (privada, solo la llama el webhook)
   - Verifica `x-webhook-secret`.
   - `PATCH https://walletobjects.googleapis.com/walletobjects/v1/loyaltyObject/{objectId}`
     con `loyaltyPoints.balance` (y `secondaryLoyaltyPoints`) actualizados. El wallet del
     cliente se refresca automáticamente.

3. (Opcional, una vez) **`wallet-google-setup`**: crea/actualiza el LoyaltyClass. Alternativa a
   hacerlo desde la consola.

**Secrets de Supabase** (`supabase secrets set`): `GOOGLE_SA_EMAIL`, `GOOGLE_SA_PRIVATE_KEY`,
`GOOGLE_WALLET_ISSUER_ID`, `GOOGLE_WALLET_CLASS_ID`, `WALLET_SYNC_SECRET`.

## Cambios en el frontend

- **`src/pages/FidelidadPublica.jsx`**: agregar el botón oficial **"Agregar a Google Wallet"**
  (badge de Google) bajo la tarjeta. onClick → `supabase.functions.invoke('wallet-google-link',
  { body: { telefono } })` → abrir la `saveUrl` devuelta. Mantener el estilo café/dorado actual.
- **`src/pages/Clientes.jsx`** (opcional): en el detalle del cliente, un botón "Compartir
  tarjeta" que copie/abra el link de `/fidelidad/{telefono}`.
- No se requieren cambios en `Vender.jsx`: la actualización de puntos ya pasa por
  `clientes.puntos_acumulados`, que dispara el webhook → sync. (Mismo beneficio para el ajuste
  manual de `Clientes.jsx`.)

## Seguridad

- El `private_key` del service account vive **solo** en Supabase secrets; nunca en el front ni
  en `VITE_*`.
- `wallet-google-sync` exige el header secreto del webhook.
- `wallet-google-link` es pública pero solo genera passes para clientes existentes (exposición
  mínima, equivalente a la página `/fidelidad` que ya es pública).

## Verificación (end-to-end)

1. Correr `wallet-google-setup` (o crear la clase en consola) y confirmar la LoyaltyClass.
2. Invocar `wallet-google-link` con un teléfono de prueba (Ana `6861112233`) → abrir la
   `saveUrl` en un **Android** y agregar la tarjeta al wallet.
3. Ajustar los puntos de Ana desde `Clientes.jsx` (o registrar una venta en el POS) → verificar
   que el **Database Webhook** dispara `wallet-google-sync` (logs vía MCP `get_logs`) y que el
   **balance en el wallet del teléfono se actualiza** en segundos.
4. Revisar `get_advisors` tras la migración.

## Fuera de alcance (fases futuras)

- **Apple Wallet** (.pkpass + APNs + web service PassKit) — requiere Apple Developer ($99/año).
- Escaneo del código QR del wallet en el POS para autoseleccionar cliente.
