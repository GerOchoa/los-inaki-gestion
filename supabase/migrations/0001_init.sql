-- Los Iñaki · Gestión
-- Esquema inicial: perfiles/roles, formulario de gastos, formulario de ventas y RLS.
-- Pensado para correr una sola vez en un proyecto Supabase nuevo (SQL Editor o CLI).

-- =========================================================
-- 1. PROFILES (rol de cada usuario: admin | empleado)
-- =========================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  role text not null default 'empleado' check (role in ('admin', 'empleado')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Cada usuario puede leer únicamente su propio perfil (necesario para que el
-- front-end sepa si mostrar el dashboard). No hace falta más para esta app:
-- no hay pantalla de administración de usuarios.
create policy "profiles_select_own"
  on public.profiles for select
  using (id = auth.uid());

-- Crea automáticamente el perfil (rol "empleado" por defecto) cuando se crea
-- un usuario en Supabase Auth. Para dar de alta un ADMIN, un superadmin debe
-- correr manualmente en el SQL Editor:
--   update public.profiles set role = 'admin' where id = '<uuid-del-usuario>';
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email),
    'empleado'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Helper usado en las políticas de gastos/ventas para evitar recursión y
-- centralizar la regla "es admin". security definer para poder leer
-- profiles sin depender de la policy de select.
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

grant execute on function public.is_admin() to authenticated;

-- =========================================================
-- 2. GASTOS
-- =========================================================
create table if not exists public.gastos (
  id bigint generated always as identity primary key,
  fecha_operacion date not null,
  rubro_proveedor text not null,
  detalle_compra text not null,
  categoria text not null check (categoria in (
    'personal', 'servicios', 'impuestos', 'mantenimiento',
    'compras_confiteria', 'insumo_alojamientos', 'marketing',
    'combustible_movilidad', 'honorarios', 'comision', 'caja_chica', 'otros'
  )),
  unidad_negocio text not null check (unidad_negocio in (
    'alojamiento', 'confiteria', 'evento', 'compartido', 'no_operativo'
  )),
  forma_pago text not null check (forma_pago in (
    'efectivo', 'transferencia', 'tarjeta', 'cuenta_corriente'
  )),
  tipo_pago text not null check (tipo_pago in (
    'gasto_operativo', 'inversion', 'retiro_familiar'
  )),
  monto numeric(12, 2) not null check (monto > 0),
  tipo_comprobante text check (tipo_comprobante in (
    'sin_comprobante', 'factura_a', 'factura_b', 'factura_c', 'ticket', 'recibo'
  )),
  numero_comprobante text,
  observaciones text,
  -- created_by (uuid) queda null cuando se carga sin sesión (formulario
  -- público). created_by_name es el registro de auditoría real: lo escribe
  -- la persona que carga, ya que no tiene usuario propio.
  created_by uuid references auth.users (id) default auth.uid(),
  created_by_name text not null,
  created_at timestamptz not null default now()
);

alter table public.gastos enable row level security;

-- El formulario es público (se comparte el link, sin usuario/clave por
-- empleado): cualquiera puede insertar. Sólo el admin puede leer.
create policy "gastos_insert_public"
  on public.gastos for insert
  to anon, authenticated
  with check (true);

create policy "gastos_select_admin"
  on public.gastos for select
  to authenticated
  using (public.is_admin());

-- =========================================================
-- 3. VENTAS
-- =========================================================
create table if not exists public.ventas (
  id bigint generated always as identity primary key,
  fecha_operacion date not null,
  monto_alojamiento numeric(12, 2) not null default 0 check (monto_alojamiento >= 0),
  monto_confiteria numeric(12, 2) not null default 0 check (monto_confiteria >= 0),
  monto_eventos numeric(12, 2) not null default 0 check (monto_eventos >= 0),
  monto_otros numeric(12, 2) not null default 0 check (monto_otros >= 0),
  detalles text,
  forma_cobro text not null check (forma_cobro in (
    'efectivo', 'transferencia', 'tarjeta', 'digital_billetera', 'plataforma', 'otros'
  )),
  tiene_comprobante boolean not null default false,
  numero_comprobante text,
  tipo_comprobante text check (tipo_comprobante in (
    'sin_comprobante', 'factura_a', 'factura_b', 'factura_c', 'ticket', 'recibo'
  )),
  observaciones text,
  created_by uuid references auth.users (id) default auth.uid(),
  created_by_name text not null,
  created_at timestamptz not null default now(),
  constraint ventas_algun_monto_cargado check (
    monto_alojamiento + monto_confiteria + monto_eventos + monto_otros > 0
  )
);

alter table public.ventas enable row level security;

create policy "ventas_insert_public"
  on public.ventas for insert
  to anon, authenticated
  with check (true);

create policy "ventas_select_admin"
  on public.ventas for select
  to authenticated
  using (public.is_admin());

-- =========================================================
-- 4. Índices básicos para el dashboard (filtros por fecha)
-- =========================================================
create index if not exists gastos_fecha_idx on public.gastos (fecha_operacion);
create index if not exists ventas_fecha_idx on public.ventas (fecha_operacion);
