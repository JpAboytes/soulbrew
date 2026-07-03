# CLAUDE.md — Soulbrew

Contexto para sesiones de Claude Code en este proyecto. Léelo antes de trabajar.

## Qué es

Soulbrew es una cafetería gestionada con dos apps web que comparten un solo backend Supabase:
el **POS/admin** (`apps/pos`, iPad-first, con auth) y la **app de cliente** (`apps/cliente`,
pública, móvil: tarjeta de fidelización + Google Wallet). Toda la UI está en **español**.

## Stack

- **Monorepo con npm workspaces**: `apps/pos`, `apps/cliente`, `packages/core`
- **React 18** + **Vite 5** (JS puro con JSX, sin TypeScript)
- **Supabase** (`@supabase/supabase-js`) — auth, base de datos Postgres, Storage y RPC. **Un solo
  proyecto** compartido por ambas apps (cliente creado vía el factory de `@soulbrew/core`)
- **React Router v6** (rutas en `apps/<app>/src/App.jsx`)
- **Tailwind CSS 3** + **lucide-react** (íconos); config de Tailwind/PostCSS por app
- Sin librería de estado global: solo React Context (`AuthContext`, solo en el POS) y `useState`/`useEffect`

## Comandos

Todos los comandos se corren **desde la raíz** del repo (workspaces):

```bash
npm install            # instala todas las apps/paquetes (un solo node_modules + lockfile)
npm run dev:pos        # POS en  http://localhost:5173  (alias: npm run dev)
npm run dev:cliente    # cliente en http://localhost:5174
npm run build          # build de producción de AMBAS apps (→ apps/<app>/dist)
npm run build:pos      # build solo del POS
npm run build:cliente  # build solo del cliente
```

No hay tests, ni ESLint/Prettier configurados, ni CI. No existe paso de typecheck.

## Estructura de Git

El repositorio Git está en `soulbrew/` (raíz del monorepo) y está limpio. Rama de trabajo: `main`.

## Variables de entorno

Cada app tiene su propio `.env.local` (no versionado), con prefijo `VITE_`. Ver `.env.example`.
- **`apps/pos/.env.local`**: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_N8N_WEBHOOK_URL`,
  (opcional) `VITE_PUBLIC_URL`.
- **`apps/cliente/.env.local`**: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` y (Web Push) `VITE_VAPID_PUBLIC_KEY` (llave pública, no secreta).

El cliente Supabase se crea con `createSupabaseClient(url, anonKey)` de **`@soulbrew/core`**; cada
app lo invoca desde su `src/lib/supabase.js` con sus propias env. Hay un MCP de Supabase en
`.mcp.json` (úsalo para inspeccionar/modificar el schema cuando sea necesario).

## Arquitectura de archivos

```
packages/core/src/         # @soulbrew/core — JS puro compartido (sin UI)
  supabase.js              #   createSupabaseClient(url, anonKey) — factory
  puntos.js                #   constantes/helpers de fidelización (getNivel, maxCanjeable, ...)
  index.js                 #   re-exporta lo anterior

apps/pos/src/              # POS/admin (protegido por auth)
  main.jsx, App.jsx, index.css
  lib/supabase.js          #   usa el factory de @soulbrew/core
  contexts/AuthContext.jsx #   sesión/usuario; useAuth()
  components/
    Layout.jsx             #   sidebar + badge de insumos críticos (realtime)
    ProtectedRoute.jsx     #   gate de sesión
    ProductoCard.jsx, InsumoCard.jsx, Toast.jsx, Markdown.jsx
  pages/
    Login.jsx              #   login + registro (Supabase Auth)
    Vender.jsx             #   POS: carrito + cliente + canje + método de pago
    Inventario.jsx         #   insumos + restock
    Productos.jsx          #   CRUD de productos, recetas, imagen
    Clientes.jsx           #   clientes, detalle, historial, ajuste de puntos, QR
    Reportes.jsx           #   corte de caja del día + reporteo diario y mensual
    Notificaciones.jsx     #   panel para enviar Web Push (a todos o a un cliente)
    Asistente.jsx          #   chat con el agente de IA (n8n)

apps/cliente/src/          # App pública del cliente (sin auth, móvil-first)
  main.jsx, App.jsx, index.css
  lib/supabase.js          #   usa el factory de @soulbrew/core
  lib/push.js              #   web push: registra SW, pide permiso, suscribe (Fase 1)
  components/RegistroModal.jsx  # popup de alta a fidelidad → tarjeta + Google Wallet + opt-in de avisos
  public/sw.js             #   service worker (recibe push, abre la app)
  pages/
    Menu.jsx               #   home: carta de la cafetería (productos activos) + CTA de fidelidad
    FidelidadPublica.jsx   #   tarjeta de fidelización + Google Wallet
```

> **Tipografía del cliente** (solo `apps/cliente`): display **Fraunces** + texto **DM Sans**
> (cargadas en `index.html`, expuestas como `font-display` / `font-sans` en su
> `tailwind.config.js`). El POS sigue con `system-ui`. La paleta de marca también suma los
> tokens `paper` (#F4EFE4) y `line` (#E2D9C8) en el cliente.

### Rutas

**`apps/pos`** (todas protegidas salvo `/login`):

| Ruta | Auth | Descripción |
|------|------|-------------|
| `/login` | pública | Login / registro |
| `/vender` | protegida | Punto de venta (ruta por defecto tras login) |
| `/inventario` | protegida | Insumos + restock |
| `/productos` | protegida | Productos + recetas |
| `/clientes` | protegida | Clientes + puntos |
| `/reportes` | protegida | Corte del día (cierre de caja) y reportes diario/mensual |
| `/notificaciones` | protegida | Enviar Web Push a clientes (broadcast o por teléfono) |
| `/asistente` | protegida | Chat con agente de IA (analítica vía n8n) |

Las rutas protegidas se envuelven en `<ProtectedRoute>` → `<Layout>` (sidebar). `/` redirige a `/vender`.

**`apps/cliente`** (pública, sin auth):

| Ruta | Descripción |
|------|-------------|
| `/` | **Home: carta/menú** de la cafetería (productos activos) + popup de alta a fidelidad |
| `/fidelidad/:telefono` | Tarjeta de fidelización del cliente (consulta por teléfono) + Google Wallet |
| resto | Redirige a `/` |

## Modelo de datos (Supabase Postgres)

Inferido del código. Verifica con el MCP de Supabase antes de cambios de schema.

- **insumos**: `id, nombre, unidad ('g'|'kg'|'ml'|'l'|'piezas'), stock_actual, stock_minimo, costo_unitario`
  - "Crítico" = `stock_actual <= stock_minimo`; "bajo" = `<= stock_minimo * 1.5`
- **restock**: `id, insumo_id, cantidad, costo_total, notas, created_by`
  - Al registrar restock se inserta la fila **y** se actualiza `insumos.stock_actual` (en el cliente, no atómico)
- **productos**: `id, nombre, descripcion, precio, categoria ('Bebidas'|'Alimentos'|'Postres'), imagen_url, activo`
- **recetas**: `id, producto_id, insumo_id, cantidad` — relación producto↔insumo (clave única `producto_id,insumo_id`, se hace upsert)
- **ventas**: `id, total, notas, created_by, cliente_id (nullable), created_at, metodo_pago (default 'efectivo'; la app usa solo 'efectivo'|'transferencia'. El CHECK de la BD aún permite 'tarjeta' por datos legados, pero el POS y los reportes ya no lo ofrecen)`
- **venta_items**: `id, venta_id, producto_id, cantidad, precio_unitario, subtotal (nullable, no se setea en el insert del POS)`
- **cortes**: `id, fecha (date), inicio, fin, fondo_inicial, total_ventas, num_ventas, total_efectivo, total_tarjeta, total_transferencia, descuentos, efectivo_esperado, efectivo_contado, diferencia, notas, created_by, created_at`
  - Snapshot histórico de cada cierre de caja. Un corte cubre el periodo **desde el `fin` del último corte del día (o el inicio del día) hasta ahora**; permite varios cortes por día (turnos). `efectivo_esperado = fondo_inicial + total_efectivo`; `diferencia = efectivo_contado − efectivo_esperado`.
- **clientes**: `id, nombre, telefono (único, 10 dígitos), email, puntos_acumulados, visitas, created_at`
- **puntos_historial**: `id, cliente_id, venta_id (nullable), puntos (+/-), concepto ('compra'|'canje'|'bono'|'ajuste'|...), created_at`
- **push_subscriptions**: `id, cliente_id (nullable, FK→clientes), endpoint (único), p256dh, auth, user_agent, created_at, updated_at` — suscripciones de Web Push. RLS: **sin acceso anon**; `authenticated` puede **SELECT** (para el conteo en el POS); el resto solo por service_role (Edge Functions `push-*`). Ver `docs/push-notifications.md`.

### Storage
- Bucket público **`productos`** para imágenes de producto (subida desde `Productos.jsx` → `uploadProductoImage`).

### RPC
- **`descontar_insumos_venta(p_venta_id)`** — descuenta inventario según las recetas de los productos vendidos. Se llama tras insertar la venta y sus items.

### Edge Functions (Deno) — `supabase/functions/`, deploy vía MCP `deploy_edge_function`
- **`wallet-google-link`** (`verify_jwt`) — genera/actualiza el LoyaltyObject y devuelve el `saveUrl` de Google Wallet para un teléfono existente. La consume `FidelidadPublica.jsx` y `RegistroModal.jsx`.
- **`wallet-google-sync`** (sin `verify_jwt`, header secreto) — la llama el webhook de `clientes` para reflejar cambios de puntos en el wallet.
- **`cliente-registro`** (`verify_jwt`) — alta pública a fidelidad desde `RegistroModal.jsx`: valida nombre + teléfono (10 díg.) con el **service_role**, evita duplicados (devuelve `{ cliente, yaExistia }`) e inserta en `clientes`. Existe porque la anon key **no** tiene `INSERT` en `clientes`.
- **`push-subscribe`** (`verify_jwt`) — guarda la suscripción de Web Push (upsert por endpoint) y la liga al cliente por teléfono. La llama el front. Ver `docs/push-notifications.md`.
- **`push-send`** (sin `verify_jwt`) — envía Web Push con `web-push` + VAPID. Body `{ telefono?, title, body, url? }` (sin teléfono = broadcast). **Auth dual**: header `x-admin-secret` (curl/server) **o** JWT de un usuario POS autenticado (lo valida contra `/auth/v1/user`; la anon key se rechaza). La usa el panel `/notificaciones` del POS. Secrets: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `PUSH_ADMIN_SECRET`.

### Funciones de analítica (para el agente de IA)
Funciones `SECURITY DEFINER` de solo lectura que devuelven `jsonb`, concedidas **solo a
`service_role`** (las consume n8n del lado servidor; el frontend NO las llama directo).
Definidas en migraciones `analytics_functions` / `fix_analytics_resumen_ventas` /
`analytics_grants_service_role_only`:
`analytics_resumen_ventas`, `analytics_ventas_por_dia`, `analytics_ventas_por_hora`,
`analytics_top_productos`, `analytics_margen_productos`, `analytics_productos_sin_receta`,
`analytics_inventario_estado`, `analytics_clientes_top`, `analytics_fidelidad_resumen`.
Detalle de parámetros en `docs/n8n-asistente.md`.

## Lógica de negocio clave

### Flujo de venta (`Vender.jsx > confirmarVenta`)
1. Insert en `ventas` (con `total` ya con descuento, `cliente_id` opcional).
2. Insert de `venta_items`.
3. RPC `descontar_insumos_venta` para descontar inventario.
4. Si hay cliente: actualiza puntos/visitas e inserta en `puntos_historial`.
- Productos **sin receta** se venden igual, pero **no descuentan inventario** (se muestra advertencia "Sin receta").
- Los pasos no son una transacción única; si un paso falla, los anteriores ya se ejecutaron.

### Programa de puntos / fidelización
- Se ganan **1 punto por cada $1** del total **sin descuento** (`Math.floor(total)`).
- Canje: múltiplos de **100 pts = $10** de descuento. Máximo canjeable = `floor(puntos/100)*100`.
- Historial registra `concepto`: `compra` (+), `canje` (−), y ajustes manuales (`bono`/`ajuste`).
- La tarjeta pública (`/fidelidad/:telefono`) muestra puntos, progreso al siguiente tier (cada 100), y niveles: 100+ recompensa disponible, 300+ VIP.

## Asistente de IA (página `/asistente`)

Chat para preguntarle a un agente sobre ventas/productos/inventario/clientes.
- **Frontend** (`apps/pos/src/pages/Asistente.jsx`): hace `POST` a `VITE_N8N_WEBHOOK_URL` con
  `{ message, sessionId, userEmail }` y el JWT del usuario en `Authorization`. Pinta la
  respuesta (`reply`/`output`/`text`/`message`/`answer`). `sessionId` se guarda en
  `sessionStorage` para dar continuidad a la memoria del agente.
- **Agente** vive en **n8n** (modelo **Claude / Anthropic**), conectado al mismo Supabase.
  Llama las funciones de analítica (arriba) como herramientas usando el **service_role key**
  (solo en n8n). Blueprint completo y system prompt en **`docs/n8n-asistente.md`**.
- **Proyecto Supabase:** `euoltfaqmmshagxsosrc` (`Soulbrew`, región us-west-2).

## Convenciones de UI / estilo

- **iPad-first**: targets táctiles con `min-h-[44px]` (o más) en botones/inputs. Respétalo.
- **Paleta de marca** (derivada del logo Soulbrew: verde olivo + café espresso. Definida en
  `tailwind.config.js`, pero el código usa los hex directamente):
  - `#42241A` café espresso (`coffee.dark`, estructura/texto) · `#5C3A28` (`coffee.medium`) · `#7C5A43` (`coffee.light`, texto muteado)
  - `#4E5B3D` verde olivo (`olive`/`gold`, **acento/CTA**): fondos de botón con texto **crema**, anillos de foco, bordes, íconos/texto sobre fondos claros
  - `#AEBB92` salvia clara (`salvia`): texto/íconos de acento **sobre fondos oscuros** (p. ej. el número de puntos en la tarjeta de fidelidad)
  - `#FAFAF7` crema/fondo (`cream`)
  - El logo **ya no es un ícono de `lucide`**: usa los PNG transparentes `/(/logo-light.png)` (sobre fondos claros) y `/logo-dark.png` (sobre fondos oscuros), servidos desde `apps/<app>/public/`. Favicon: `/favicon.png`. Originales en `public/` (raíz).
- Patrones repetidos: modales con `fixed inset-0 bg-black/...backdrop-blur-sm`, tarjetas `rounded-2xl/3xl`,
  spinners con `animate-spin border-[#4E5B3D] border-t-transparent`, toasts efímeros.
- Manejo de errores actual: mayormente `alert(error.message)` en modales y `<Toast>`/banner en páginas. Es el patrón existente; mantenlo salvo que se pida mejorarlo.
- Realtime: `Layout.jsx` se suscribe a cambios de la tabla `insumos` (Supabase channel) para el badge de insumos críticos.

## Notas para trabajar

- Idioma: nombres de variables/UI/commits en español, siguiendo el código existente.
- Al añadir queries, sigue el patrón `const { data, error } = await supabase.from(...)...`.
- El README describe páginas desactualizadas (no menciona Clientes/Fidelidad); esta CLAUDE.md es la referencia actual.
- RLS: la app usa la anon key; las políticas de seguridad viven en Supabase. La ruta pública de fidelidad consulta `clientes`/`puntos_historial` sin sesión (lectura pública). El **menú** del cliente lee `productos` con la policy `anon_read_productos_activos` (solo `activo = true`). El **alta** de clientes NO se hace con la anon key (sin `INSERT`): pasa por la Edge Function `cliente-registro` (service_role).
