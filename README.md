# Los Iñaki — Gestión

App interna para cargar gastos y ventas de la hotelería/gastronomía "Los Iñaki"
y ver un tablero gerencial (GOP, ingresos, gastos, insights) con datos reales.

## Stack

- **Next.js 16 (App Router) + TypeScript** — front-end y backend (server actions) en un solo proyecto.
- **Supabase** (PostgreSQL + Auth + RLS) — base de datos, autenticación y control de permisos.
- **Vercel** — hosting.

No hay backend propio ni API custom: los formularios escriben directo a
Supabase mediante Server Actions ejecutadas con la sesión del usuario
logueado, y toda la seguridad de "quién puede ver/cargar qué" vive en
Postgres (RLS), no sólo en el frontend.

## Estructura

```
src/
  app/
    login/                 → pantalla de login (Supabase Auth)
    formularios/gasto/     → formulario de gasto (ADMIN y EMPLEADO)
    formularios/venta/     → formulario de venta (ADMIN y EMPLEADO)
    dashboard/             → tablero gerencial (sólo ADMIN)
  lib/
    supabase/               → clientes de Supabase (server, browser, middleware)
    validation.ts           → opciones de los selects + validación de ambos formularios
    dashboard/
      transform.ts          → convierte filas de Supabase al formato que espera el tablero
      compute.ts             → motor de cálculo del tablero (portado del index.html de referencia)
  proxy.ts                  → protege rutas privadas (redirige a /login si no hay sesión)
supabase/migrations/0001_init.sql  → esquema completo (tablas, RLS, trigger de perfiles)
```

## Modelo de datos y permisos (resumen)

- **`profiles`**: 1 fila por usuario, con `role` (`admin` | `empleado`). Se crea sola
  con un trigger cuando el usuario se registra en Supabase Auth (rol `empleado` por defecto).
- **`gastos`** y **`ventas`**: 1 fila por carga, con `created_by` (usuario) y
  `created_at` (fecha/hora) para auditoría. Los campos siguen el Formulario 1 y el
  Formulario 2 provistos.
  - `ventas` guarda `monto_alojamiento`, `monto_confiteria`, `monto_eventos`,
    `monto_otros` como columnas separadas (así una sola carga puede repartir
    ingresos entre unidades), en vez de una fila por unidad de negocio.
- **RLS**:
  - Cualquier usuario autenticado puede **insertar** en `gastos`/`ventas`, siempre
    que `created_by` sea su propio `auth.uid()` (no se puede cargar a nombre de otro).
  - Sólo `role = 'admin'` puede **leer** `gastos`/`ventas` (alimenta el dashboard).
  - Cada usuario sólo puede leer su propio `profiles` (para saber su rol).
  - No hay políticas de update/delete: los datos cargados no se editan desde la
    app (si hace falta corregir algo, se hace desde el SQL Editor de Supabase).

Este control está en la base de datos, no sólo en el frontend: aunque alguien
manipule el cliente o llame a la API de Supabase directamente, RLS bloquea lo
que no le corresponde a su rol.

### Decisiones tomadas (breve)

- **Next.js 16 + Supabase**, sin alternativas: para una app CRUD chica con 2
  formularios y un dashboard, este stack da auth + roles + permisos "gratis"
  vía RLS, sin mantener un backend aparte. Vercel + Supabase se despliegan en
  minutos y escalan de sobra para este volumen de datos.
- **Un solo rol "empleado"** con acceso a ambos formularios (gasto y venta):
  el enunciado no distingue permisos entre formularios, así que no se separó
  en roles más finos para no sobre-diseñar. Si en el futuro hace falta separar
  (por ej. "empleado de confitería" que sólo carga ventas), se agrega una
  columna más en `profiles` y una policy de `insert` con ese chequeo.
  Multi tenancy y usuarios: **no hay alta de usuarios desde la app**. Un admin
  crea el usuario en Supabase (Authentication → Users) y, si corresponde, corre
  un `update profiles set role='admin' where id='...'` en el SQL Editor. Es
  intencional: son pocos usuarios y evita construir una pantalla de admin que
  nadie más va a usar.
- **`tipo_pago = 'retiro_familiar'`** se excluye del GOP igual que las
  inversiones (no es un gasto operativo del negocio), y se muestra aparte en
  la pestaña "Otros / Gestión".
- El dashboard reusa el diseño/CSS y el motor de cálculo (GOP, comparativas,
  drivers, insights, preguntas estratégicas) del `index.html` de referencia
  casi 1 a 1, sólo cambiando la fuente de datos (Supabase en vez de Excel/
  localStorage) y sacando la carga manual de archivos, que ya no hace falta.

## Puesta en marcha

### 1. Crear el proyecto en Supabase

1. Creá un proyecto nuevo en [supabase.com](https://supabase.com).
2. Andá a **SQL Editor** y corré el contenido de `supabase/migrations/0001_init.sql`.
3. En **Authentication → Providers**, dejá habilitado sólo Email/Password.
4. En **Authentication → Users**, creá un usuario para cada persona (con
   "Auto Confirm User" activado para no depender de emails de confirmación).
5. Para dar de alta un **admin**, corré en el SQL Editor:
   ```sql
   update public.profiles set role = 'admin' where id = '<uuid-del-usuario>';
   ```
   (el resto queda como `empleado` por defecto).
6. En **Project Settings → API**, copiá `Project URL` y `anon public key`.

### 2. Configurar el proyecto local

```bash
cp .env.example .env.local
# completar NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY

npm install
npm run dev
```

Abrí http://localhost:3000 e iniciá sesión con un usuario creado en el paso anterior.

### 3. Desplegar

1. Subí este repo a GitHub.
2. En [Vercel](https://vercel.com), importá el repo.
3. Cargá las mismas variables de entorno (`NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_ANON_KEY`) en **Project Settings → Environment Variables**.
4. Deploy. Cada push a la rama principal vuelve a desplegar solo.

No hace falta configurar nada más: no se usa la `service_role key` en ningún
lado, así que no hay secretos sensibles que cuidar más allá de las dos
variables públicas de Supabase (están pensadas para ser públicas: la
seguridad real la da RLS).

## Scripts

- `npm run dev` — desarrollo local.
- `npm run build` — build de producción (falla si hay errores de TypeScript).
- `npm run lint` — ESLint.
- `npm run typecheck` — sólo chequeo de tipos, sin compilar.

## Próximos pasos posibles (no implementados, a propósito)

- Ocupación/ADR/RevPAR en Alojamiento: requiere un módulo de reservas
  (check-in/check-out, cabaña) que hoy no existe en el formulario.
- Métricas de ticket/producto en Confitería: requiere cargar cantidad de
  tickets o cierre diario, no sólo el monto total.
- Edición/borrado de cargas ya hechas: hoy se resuelve manualmente desde
  Supabase; se puede agregar una pantalla si se vuelve una necesidad real.
