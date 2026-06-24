# Soulbrew — Sistema de Gestión de Cafetería

Monorepo (npm workspaces) con dos apps web que comparten un solo backend Supabase:

- **`apps/pos`** — POS/admin iPad-first (con auth): ventas, inventario, productos, clientes,
  reportes/corte de caja y asistente de IA.
- **`apps/cliente`** — App pública del cliente (sin auth): tarjeta de fidelización + Google Wallet.
- **`packages/core`** — código compartido (factory del cliente Supabase + lógica de fidelización).

## Stack

- React 18 + Vite 5 · React Router v6 · Tailwind CSS 3 · Lucide React
- Supabase (auth + Postgres + Storage + RPC) — un solo proyecto para ambas apps

## Setup

### 1. Instalar dependencias (desde la raíz)

```bash
npm install
```

Instala todas las apps y paquetes con un único `node_modules` y lockfile.

### 2. Variables de entorno

Cada app tiene su propio `.env.local`. Ver `.env.example` para el detalle:

- `apps/pos/.env.local`: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_N8N_WEBHOOK_URL`,
  (opcional) `VITE_PUBLIC_URL`.
- `apps/cliente/.env.local`: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.

Las credenciales están en Supabase → **Settings → API**.

### 3. Desarrollo

```bash
npm run dev:pos        # POS     → http://localhost:5173
npm run dev:cliente    # Cliente → http://localhost:5174
```

### 4. Build de producción

```bash
npm run build          # ambas apps (→ apps/<app>/dist)
npm run build:pos      # solo POS
npm run build:cliente  # solo cliente
```

## Deploy (Vercel)

Dos proyectos sobre el mismo repo, cada uno con su **Root Directory**:

| Proyecto | Root Directory | Build | Output |
|----------|----------------|-------|--------|
| POS | `apps/pos` | `npm run build` | `dist` |
| Cliente | `apps/cliente` | `npm run build` | `dist` |

Cada proyecto define sus propias variables de entorno y su dominio. Las Edge Functions
(Google Wallet) viven en `supabase/functions`.

> Para el contexto completo de arquitectura, modelo de datos y lógica de negocio, ver `CLAUDE.md`.
