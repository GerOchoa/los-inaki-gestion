// Opciones de los desplegables (value = lo que se guarda en Supabase,
// label = lo que ve el usuario) y validación compartida entre el
// formulario (feedback inmediato) y la server action (fuente de verdad).

export const CATEGORIA_GASTO_OPTIONS = [
  ["personal", "Personal"],
  ["servicios", "Servicios"],
  ["impuestos", "Impuestos"],
  ["mantenimiento", "Mantenimiento"],
  ["compras_confiteria", "Compras confitería"],
  ["insumo_alojamientos", "Insumo alojamientos"],
  ["marketing", "Marketing"],
  ["combustible_movilidad", "Combustible/movilidad"],
  ["honorarios", "Honorarios"],
  ["comision", "Comisión"],
  ["caja_chica", "Caja chica"],
  ["otros", "Otros"],
] as const;

export const UNIDAD_NEGOCIO_GASTO_OPTIONS = [
  ["alojamiento", "Alojamiento"],
  ["confiteria", "Confitería"],
  ["evento", "Evento"],
  ["compartido", "Compartido"],
  ["no_operativo", "No operativo"],
] as const;

export const FORMA_PAGO_OPTIONS = [
  ["efectivo", "Efectivo"],
  ["transferencia", "Transferencia"],
  ["tarjeta", "Tarjeta"],
  ["cuenta_corriente", "Cuenta corriente"],
] as const;

export const TIPO_PAGO_OPTIONS = [
  ["gasto_operativo", "Gasto operativo"],
  ["inversion", "Inversión"],
  ["retiro_familiar", "Retiro familiar"],
] as const;

export const TIPO_COMPROBANTE_OPTIONS = [
  ["sin_comprobante", "Sin comprobante"],
  ["factura_a", "Factura A"],
  ["factura_b", "Factura B"],
  ["factura_c", "Factura C"],
  ["ticket", "Ticket"],
  ["recibo", "Recibo"],
] as const;

export const FORMA_COBRO_OPTIONS = [
  ["efectivo", "Efectivo"],
  ["transferencia", "Transferencia"],
  ["tarjeta", "Tarjeta"],
  ["digital_billetera", "Digital/billetera virtual"],
  ["plataforma", "Plataforma"],
  ["otros", "Otros"],
] as const;

function valuesOf(options: readonly (readonly [string, string])[]) {
  return options.map(([v]) => v);
}

export interface GastoInput {
  created_by_name: string;
  fecha_operacion: string;
  rubro_proveedor: string;
  detalle_compra: string;
  categoria: string;
  unidad_negocio: string;
  forma_pago: string;
  tipo_pago: string;
  monto: string;
  tipo_comprobante: string;
  numero_comprobante: string;
  observaciones: string;
}

export interface VentaInput {
  created_by_name: string;
  fecha_operacion: string;
  monto_alojamiento: string;
  monto_confiteria: string;
  monto_eventos: string;
  monto_otros: string;
  detalles: string;
  forma_cobro: string;
  tiene_comprobante: string; // "si" | "no"
  numero_comprobante: string;
  tipo_comprobante: string;
  observaciones: string;
}

export type ValidationErrors = Record<string, string>;

function requireDate(value: string, field: string, errors: ValidationErrors) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    errors[field] = "Ingresá una fecha válida.";
  }
}

function requireText(value: string, field: string, label: string, errors: ValidationErrors) {
  if (!value || !value.trim()) {
    errors[field] = `${label} es obligatorio.`;
  }
}

function requireOption(
  value: string,
  field: string,
  label: string,
  options: readonly (readonly [string, string])[],
  errors: ValidationErrors
) {
  if (!valuesOf(options).includes(value)) {
    errors[field] = `Elegí ${label}.`;
  }
}

function optionalOption(
  value: string,
  field: string,
  label: string,
  options: readonly (readonly [string, string])[],
  errors: ValidationErrors
) {
  if (value && !valuesOf(options).includes(value)) {
    errors[field] = `${label} no es válido.`;
  }
}

function parseMonto(value: string): number | null {
  if (value === "" || value === null || value === undefined) return null;
  const n = Number(value.toString().replace(",", "."));
  if (Number.isNaN(n)) return null;
  return n;
}

export function validateGasto(input: GastoInput): { ok: boolean; errors: ValidationErrors } {
  const errors: ValidationErrors = {};

  requireText(input.created_by_name, "created_by_name", "Tu nombre", errors);
  requireDate(input.fecha_operacion, "fecha_operacion", errors);
  requireText(input.rubro_proveedor, "rubro_proveedor", "Rubro/Proveedor", errors);
  requireText(input.detalle_compra, "detalle_compra", "Detalle de compra", errors);
  requireOption(input.categoria, "categoria", "una categoría", CATEGORIA_GASTO_OPTIONS, errors);
  requireOption(
    input.unidad_negocio,
    "unidad_negocio",
    "una unidad de negocio",
    UNIDAD_NEGOCIO_GASTO_OPTIONS,
    errors
  );
  requireOption(input.forma_pago, "forma_pago", "una forma de pago", FORMA_PAGO_OPTIONS, errors);
  requireOption(input.tipo_pago, "tipo_pago", "un tipo de pago", TIPO_PAGO_OPTIONS, errors);
  optionalOption(
    input.tipo_comprobante,
    "tipo_comprobante",
    "El tipo de comprobante",
    TIPO_COMPROBANTE_OPTIONS,
    errors
  );

  const monto = parseMonto(input.monto);
  if (monto === null || monto <= 0) {
    errors.monto = "El monto debe ser un número mayor a 0.";
  }

  return { ok: Object.keys(errors).length === 0, errors };
}

export function validateVenta(input: VentaInput): { ok: boolean; errors: ValidationErrors } {
  const errors: ValidationErrors = {};

  requireText(input.created_by_name, "created_by_name", "Tu nombre", errors);
  requireDate(input.fecha_operacion, "fecha_operacion", errors);
  requireOption(input.forma_cobro, "forma_cobro", "una forma de cobro", FORMA_COBRO_OPTIONS, errors);
  optionalOption(
    input.tipo_comprobante,
    "tipo_comprobante",
    "El tipo de comprobante",
    TIPO_COMPROBANTE_OPTIONS,
    errors
  );

  if (!["si", "no"].includes(input.tiene_comprobante)) {
    errors.tiene_comprobante = "Indicá si hay comprobante.";
  }

  const montos = [
    ["monto_alojamiento", input.monto_alojamiento],
    ["monto_confiteria", input.monto_confiteria],
    ["monto_eventos", input.monto_eventos],
    ["monto_otros", input.monto_otros],
  ] as const;

  let total = 0;
  for (const [field, raw] of montos) {
    const v = raw === "" ? 0 : parseMonto(raw);
    if (v === null || v < 0) {
      errors[field] = "Tiene que ser un número mayor o igual a 0.";
    } else {
      total += v;
    }
  }

  if (total <= 0) {
    errors.monto_alojamiento = errors.monto_alojamiento || "Cargá al menos un monto mayor a 0.";
  }

  return { ok: Object.keys(errors).length === 0, errors };
}
