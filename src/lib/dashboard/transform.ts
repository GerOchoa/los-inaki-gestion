import type { GastoRow, VentaRow } from "@/lib/types";
import {
  CATEGORIA_GASTO_OPTIONS,
  UNIDAD_NEGOCIO_GASTO_OPTIONS,
  FORMA_PAGO_OPTIONS,
  TIPO_PAGO_OPTIONS,
  TIPO_COMPROBANTE_OPTIONS,
  FORMA_COBRO_OPTIONS,
} from "@/lib/validation";

// El tablero (compute.ts) está portado del index.html de referencia, que
// esperaba filas "planas" con estas claves. En vez de reescribir todo ese
// motor, transformamos acá las filas reales de Supabase a esa misma forma.
// Así el diseño/estructura del tablero original se mantiene intacto.

export interface DashRow {
  id: string;
  "FECHA DE OPERACION": string;
  "UNIDAD DE NEGOCIO": string;
  "DETALLE - CONCEPTO": string;
  MONTO: number;
  "FORMA DE COBRO O PAGO": string;
  COMPROBANTE: string; // "SI" | "NO"
  "TIPO DE COMPROBANTE": string;
  "N° DE COMPROBANTE": string;
  OBSERVACIONES: string;
  TIPO: string; // sólo gastos: GASTO OPERATIVO | INVERSION | RETIRO FAMILIAR
  CATEGORIA: string; // sólo gastos
}

function labelOf(options: readonly (readonly [string, string])[], value: string | null) {
  if (!value) return "";
  const found = options.find(([v]) => v === value);
  return (found ? found[1] : value).toUpperCase();
}

export function gastosToRows(gastos: GastoRow[]): DashRow[] {
  return gastos.map((g) => ({
    id: `gasto-${g.id}`,
    "FECHA DE OPERACION": g.fecha_operacion,
    "UNIDAD DE NEGOCIO": labelOf(UNIDAD_NEGOCIO_GASTO_OPTIONS, g.unidad_negocio),
    "DETALLE - CONCEPTO": g.detalle_compra || g.rubro_proveedor,
    MONTO: Number(g.monto) || 0,
    "FORMA DE COBRO O PAGO": labelOf(FORMA_PAGO_OPTIONS, g.forma_pago),
    COMPROBANTE: g.tipo_comprobante && g.tipo_comprobante !== "sin_comprobante" ? "SI" : "NO",
    "TIPO DE COMPROBANTE": labelOf(TIPO_COMPROBANTE_OPTIONS, g.tipo_comprobante) || "SIN COMPROBANTE",
    "N° DE COMPROBANTE": g.numero_comprobante || "",
    OBSERVACIONES: g.observaciones || "",
    TIPO: labelOf(TIPO_PAGO_OPTIONS, g.tipo_pago),
    CATEGORIA: labelOf(CATEGORIA_GASTO_OPTIONS, g.categoria),
  }));
}

// Cada venta puede traer plata de varias unidades de negocio a la vez
// (alojamiento, confitería, eventos, otros). Para reusar la lógica del
// tablero original (una fila = un monto de una sola unidad) generamos una
// fila "pseudo" por cada monto > 0.
export function ventasToRows(ventas: VentaRow[]): DashRow[] {
  const out: DashRow[] = [];

  for (const v of ventas) {
    const montosPorUnidad: [string, number][] = [
      ["ALOJAMIENTO", Number(v.monto_alojamiento) || 0],
      ["CONFITERIA", Number(v.monto_confiteria) || 0],
      ["EVENTOS", Number(v.monto_eventos) || 0],
      ["OTROS", Number(v.monto_otros) || 0],
    ];

    for (const [unidad, monto] of montosPorUnidad) {
      if (monto <= 0) continue;
      out.push({
        id: `venta-${v.id}-${unidad}`,
        "FECHA DE OPERACION": v.fecha_operacion,
        "UNIDAD DE NEGOCIO": unidad,
        "DETALLE - CONCEPTO": v.detalles || unidad,
        MONTO: monto,
        "FORMA DE COBRO O PAGO": labelOf(FORMA_COBRO_OPTIONS, v.forma_cobro),
        COMPROBANTE: v.tiene_comprobante ? "SI" : "NO",
        "TIPO DE COMPROBANTE": labelOf(TIPO_COMPROBANTE_OPTIONS, v.tipo_comprobante) || "SIN COMPROBANTE",
        "N° DE COMPROBANTE": v.numero_comprobante || "",
        OBSERVACIONES: v.observaciones || "",
        TIPO: "",
        CATEGORIA: "",
      });
    }
  }

  return out;
}
