# Asistente de IA — Blueprint de n8n

Workflow de n8n que atiende el chat de la página `/asistente`. El agente (Claude)
responde preguntas de negocio consultando funciones de analítica en Supabase.

```
[Webhook] → [AI Agent (Claude)] → [Respond to Webhook]
                  │
                  ├── Memory: Postgres Chat Memory (Supabase)
                  └── Tools: 9 × HTTP Request → Supabase RPC
```

## Datos de conexión

- **Supabase URL:** `https://euoltfaqmmshagxsosrc.supabase.co`
- **RPC endpoint:** `POST {SUPABASE_URL}/rest/v1/rpc/<nombre_funcion>`
- **Auth:** header `apikey` + `Authorization: Bearer <SERVICE_ROLE_KEY>`
  - ⚠️ El **service_role key** se guarda SOLO como credencial en n8n (servidor). Nunca en el frontend.
  - Lo obtienes en Supabase → Project Settings → API → `service_role` (secret).

---

## 1. Nodo Webhook

- **HTTP Method:** `POST`
- **Path:** `soulbrew-asistente` (la URL resultante va en `VITE_N8N_WEBHOOK_URL` del frontend)
- **Respond:** `Using 'Respond to Webhook' node`
- El frontend manda este body:
  ```json
  { "message": "texto del usuario", "sessionId": "uuid", "userEmail": "..." }
  ```
- También llega el header `Authorization: Bearer <jwt del usuario>` (ver sección Seguridad).

## 2. Nodo AI Agent

- **Tipo:** AI Agent (Tools Agent)
- **Chat Model:** Anthropic Chat Model → modelo `claude-sonnet-4-6` (buen balance costo/calidad para tool-calling). Requiere credencial con tu API key de Anthropic.
- **Prompt / Text:** `{{ $json.body.message }}`
- **System Message:** (ver abajo)
- **Memory:** Postgres Chat Memory
  - Conexión: la misma base de Supabase (usa la connection string de Postgres del proyecto).
  - **Session Key:** `{{ $json.body.sessionId }}`
  - Crea la tabla de historial automáticamente (o usa `n8n_chat_histories`).

### System Message sugerido

> ⚠️ **Importante (bug de fechas):** el modelo NO conoce la fecha actual y, si la
> inventa, calculará rangos en el pasado y las herramientas devolverán 0 ventas. Por eso
> la primera línea del system message DEBE inyectar la fecha real con una expresión de n8n.
> En el campo *System Message* activa el modo expresión y empieza con:
> `La fecha y hora actual es {{ $now.setZone('America/Tijuana').toFormat('yyyy-MM-dd HH:mm') }} (zona America/Tijuana).`

```
La fecha y hora actual es {{ $now.setZone('America/Tijuana').toFormat('yyyy-MM-dd HH:mm') }} (zona America/Tijuana).

Eres el asistente de analítica de "Soulbrew", una cafetería. Respondes en español,
de forma clara, concreta y orientada a la acción de un dueño de negocio.

Tienes herramientas que consultan datos reales de ventas, productos, inventario y
clientes. SIEMPRE usa las herramientas para obtener cifras; nunca inventes números.

Manejo de fechas (CRÍTICO):
- Calcula SIEMPRE los rangos a partir de la fecha actual indicada arriba, nunca de tu
  conocimiento previo.
- Para "últimos 30 días" puedes NO enviar p_desde/p_hasta: las herramientas ya usan ese
  rango por defecto (relativo a la fecha real del servidor).
- Para "hoy", "esta semana", "este mes" o un periodo específico, calcula p_desde/p_hasta
  en formato ISO (YYYY-MM-DD) a partir de la fecha actual y envíalos.
- Si el usuario no especifica periodo, usa los últimos 30 días y acláralo en la respuesta.

Reglas del negocio que debes conocer:
- Los ingresos (`ventas.total`) ya incluyen descuentos por canje de puntos.
- Programa de fidelidad: 1 punto por cada $1 gastado; 100 puntos = $10 de descuento.
- Un producto puede venderse SIN receta; en ese caso NO descuenta inventario (es una
  posible fuga de control). Usa `analytics_productos_sin_receta` para detectarlo.
- El margen real de un producto = precio − costo de su receta. Un margen negativo
  significa que se vende a pérdida o que la receta/costos están mal capturados.
- Moneda: pesos mexicanos (MXN). Zona horaria: America/Tijuana.

Al responder: da el número clave primero, luego 1-2 frases de interpretación y, si
aplica, una recomendación. Usa listas cortas. Formatea montos como $X,XXX.XX.
Las fechas se pasan a las herramientas en formato ISO (YYYY-MM-DD).
```

## 3. Herramientas (HTTP Request Tool × 9)

Cada herramienta es un nodo **HTTP Request** en modo *Tool*:
- **Method:** `POST`
- **URL:** `https://euoltfaqmmshagxsosrc.supabase.co/rest/v1/rpc/<funcion>`
- **Authentication:** Header Auth (o Generic) con:
  - `apikey: <SERVICE_ROLE_KEY>`
  - `Authorization: Bearer <SERVICE_ROLE_KEY>`
  - `Content-Type: application/json`
- **Body (JSON):** los parámetros, dejando que el agente los rellene con `$fromAI(...)`.
  Omite un parámetro para usar su valor por defecto.

| Herramienta (name) | Función RPC | Parámetros | Para qué sirve |
|---|---|---|---|
| `resumen_ventas` | `analytics_resumen_ventas` | `p_desde`, `p_hasta` (ISO, opc.) | Ingresos, # ventas, ticket promedio, % identificadas |
| `ventas_por_dia` | `analytics_ventas_por_dia` | `p_desde`, `p_hasta`, `p_tz` (opc.) | Serie diaria para tendencias |
| `ventas_por_hora` | `analytics_ventas_por_hora` | `p_desde`, `p_hasta`, `p_tz` (opc.) | Horas pico |
| `top_productos` | `analytics_top_productos` | `p_desde`, `p_hasta`, `p_limite`, `p_orden` (`ingresos`\|`unidades`) | Más vendidos |
| `margen_productos` | `analytics_margen_productos` | `p_desde`, `p_hasta` | Rentabilidad real por producto ★ |
| `productos_sin_receta` | `analytics_productos_sin_receta` | `p_desde`, `p_hasta` | Fuga de inventario ★ |
| `inventario_estado` | `analytics_inventario_estado` | `p_dias_consumo` (opc.) | Stock, estado y días restantes |
| `clientes_top` | `analytics_clientes_top` | `p_limite` (opc.) | Clientes por valor (LTV) |
| `fidelidad_resumen` | `analytics_fidelidad_resumen` | — | Puntos otorgados/canjeados, canjeables |

**Ejemplo de body con `$fromAI`** (herramienta `top_productos`):
```json
{
  "p_desde": "={{ $fromAI('p_desde', 'fecha inicio ISO YYYY-MM-DD', 'string') }}",
  "p_hasta": "={{ $fromAI('p_hasta', 'fecha fin ISO YYYY-MM-DD', 'string') }}",
  "p_limite": "={{ $fromAI('p_limite', 'cuántos productos', 'number') }}",
  "p_orden":  "={{ $fromAI('p_orden', 'ingresos o unidades', 'string') }}"
}
```

> Las funciones tienen defaults (últimos 30 días, tz `America/Tijuana`), así que el
> agente puede enviar `{}` si no necesita acotar.

## 4. Nodo Respond to Webhook

- **Respond With:** JSON
- **Body:** `{ "reply": "={{ $json.output }}" }`
  (el frontend acepta `reply`, `output`, `text`, `message` o `answer`).

---

## Seguridad

1. **service_role solo en n8n.** Da acceso total a la base; jamás lo pongas en el frontend
   ni en variables `VITE_*`. Las funciones de analítica están concedidas **solo a `service_role`**.
2. **Valida el JWT del usuario.** El frontend envía `Authorization: Bearer <token de Supabase>`.
   Añade un nodo que verifique el token contra
   `GET {SUPABASE_URL}/auth/v1/user` (con `apikey` anon) antes del agente; si responde 401,
   corta con un Respond 401. Esto evita que cualquiera con la URL del webhook consuma el agente.
3. **Alternativa simple:** un header secreto compartido entre frontend y n8n (menos robusto que el JWT).
4. **Rate limiting** en n8n si lo expones a varios cajeros.

## Extensión: reportes proactivos (bonus)

Un segundo workflow con **Schedule Trigger** (p. ej. diario 9:00) que llame a
`resumen_ventas` + `inventario_estado` del día anterior, pida a Claude un resumen y lo
envíe por WhatsApp/Telegram/email. Reutiliza las mismas herramientas RPC.

## Cómo probar las funciones manualmente (curl)

```bash
curl -X POST 'https://euoltfaqmmshagxsosrc.supabase.co/rest/v1/rpc/analytics_resumen_ventas' \
  -H "apikey: $SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{}'
```
