# Web Push — notificaciones a clientes (Fase 1)

Notificaciones web para la app de cliente (`apps/cliente`). Permiten avisar a los clientes
(promos a todos, o mensajes por cliente) aunque la web esté cerrada.

> **Estado:** Fase 1 (plomería) construida. Falta que el dueño cargue los secrets/env
> manuales (abajo) para que funcione en producción.

## Arquitectura

```
Cliente (navegador)                    Supabase                          Navegador push service
──────────────────                     ────────                          ─────────────────────
[/sw.js]  service worker
   └─ pide permiso → PushManager.subscribe(VAPID_PUBLIC)
        └─ POST push-subscribe ──────► [push-subscribe]  (verify_jwt)
                                          guarda en push_subscriptions
                                          (liga cliente por teléfono)

Admin / evento  ── x-admin-secret ────► [push-send]  (secreto)
                                          web-push + VAPID → POST a cada endpoint ──► entrega al dispositivo
```

- **Service Worker:** `apps/cliente/public/sw.js` — recibe el `push` y muestra la notificación.
- **Helper front:** `apps/cliente/src/lib/push.js` — registra el SW, pide permiso, suscribe.
- **Opt-in:** botón "Recibir avisos y promos" en `RegistroModal.jsx` (paso post-registro),
  ligado al teléfono del cliente.
- **Tabla:** `push_subscriptions` (`id, cliente_id?, endpoint único, p256dh, auth, user_agent,
  created_at, updated_at`). RLS **on sin policies anon**: solo el service_role la toca.
- **Edge Functions:**
  - `push-subscribe` (`verify_jwt`) — guarda/actualiza la suscripción (upsert por endpoint),
    la liga al cliente por teléfono. La llama el front con la anon key.
  - `push-send` (sin `verify_jwt`, header `x-admin-secret`) — envía con `web-push` + VAPID.
    Body: `{ telefono?, title, body, url? }`. Sin `telefono` = **broadcast**; con teléfono =
    a ese cliente. Limpia suscripciones expiradas (404/410).

## ⚠️ iPhone / Safari

Web Push en iOS **solo funciona si el cliente agregó la web a la pantalla de inicio**
(PWA instalada) y está en iOS 16.4+. En Safari normal no llega. El `RegistroModal` detecta
iPhone sin instalar y muestra el instructivo "Compartir → Agregar a inicio". Android/Chrome
funciona en el navegador normal.

## Pasos manuales (una vez)

### 1. Secrets en Supabase (Dashboard → Project Settings → Edge Functions → Secrets)

| Secret | Qué es |
|---|---|
| `VAPID_PUBLIC_KEY` | Llave pública VAPID (la misma que el front) |
| `VAPID_PRIVATE_KEY` | Llave privada VAPID — **secreta** |
| `VAPID_SUBJECT` | `mailto:tu-correo@soulbrew.mx` (contacto del emisor) |
| `PUSH_ADMIN_SECRET` | Secreto para autorizar `push-send` — **secreto** |

> Los valores (incluida la llave privada y el admin secret) **no se versionan** en este repo
> (es público). Genera nuevas llaves VAPID con `npx web-push generate-vapid-keys` si las
> pierdes, y actualiza tanto el secret de Supabase como el env del front/Vercel.

### 2. Env en Vercel (proyecto `soulbrew-cliente`)

| Variable | Valor |
|---|---|
| `VITE_VAPID_PUBLIC_KEY` | La llave **pública** VAPID (no es secreta) |

Redeploy del cliente tras agregarla. En local ya está en `apps/cliente/.env.local`.

## Probar (end-to-end)

1. Con los secrets/env cargados, abre el cliente (Android/Chrome o iOS instalado), regístrate
   y toca **"Recibir avisos y promos"** → acepta el permiso.
2. Verifica que se guardó: `select * from push_subscriptions;`.
3. Envía una prueba:
   ```bash
   curl -X POST 'https://euoltfaqmmshagxsosrc.supabase.co/functions/v1/push-send' \
     -H "x-admin-secret: $PUSH_ADMIN_SECRET" -H 'Content-Type: application/json' \
     -d '{"title":"Soulbrew","body":"¡Hoy 2x1 en lattes! ☕","url":"/"}'
   ```
   Broadcast a todos. Para un solo cliente: agrega `"telefono":"6682217601"`.
   Respuesta: `{ sent, failed, cleaned }`.

## Fuera de alcance (fases futuras)

- **Fase 2** — segmentación fina por cliente (ya está el `cliente_id` en la tabla).
- **Fase 3** — panel en el POS para redactar/enviar (llamará a `push-send` vía una función
  autenticada por JWT, no con el secreto en el front).
- **Fase 4** — envíos automáticos por evento (p. ej. al cruzar 100 pts).
- iPhone vía notificaciones del **pase de Wallet** como canal alterno.
