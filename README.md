# Soulbrew — Sistema de Gestión de Cafetería

App web iPad-first para gestión de inventario, productos y punto de venta.

## Stack

- React 18 + Vite
- Supabase (auth + base de datos)
- React Router v6
- Tailwind CSS
- Lucide React

## Setup

### 1. Clonar e instalar dependencias

```bash
npm install
```

### 2. Variables de entorno

Copia `.env.example` a `.env.local` y completa con tus credenciales de Supabase:

```bash
cp .env.example .env.local
```

```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key
```

Las credenciales las encuentras en tu proyecto de Supabase en:
**Settings → API → Project URL** y **anon public key**

### 3. Base de datos en Supabase

El schema ya debe estar aplicado (tablas: `insumos`, `restock`, `productos`, `recetas`, `ventas`, `venta_items`).

Si necesitas aplicarlo manualmente, ejecuta el SQL del archivo `schema.sql` en el **SQL Editor** de Supabase.

### 4. Correr en desarrollo

```bash
npm run dev
```

Abre [http://localhost:5173](http://localhost:5173) en el navegador.

### 5. Build de producción

```bash
npm run build
```

## Páginas

| Ruta | Descripción |
|------|-------------|
| `/login` | Autenticación (login + registro) |
| `/vender` | Punto de venta — carrito + confirmación |
| `/inventario` | Gestión de insumos + restock |
| `/productos` | Productos + recetas |

## Flujo de venta

1. El cajero selecciona productos desde el grid
2. El carrito calcula el total automáticamente
3. Al confirmar, se inserta la venta, los items, y se llama a `descontar_insumos_venta()` en Supabase para descontar el inventario según las recetas configuradas
4. Si un producto no tiene receta, la venta se procesa igualmente con una advertencia visible
