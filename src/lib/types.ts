export type Role = "admin" | "empleado";

export interface Profile {
  id: string;
  full_name: string | null;
  role: Role;
  created_at: string;
}

export type CategoriaGasto =
  | "personal"
  | "servicios"
  | "impuestos"
  | "mantenimiento"
  | "compras_confiteria"
  | "insumo_alojamientos"
  | "marketing"
  | "combustible_movilidad"
  | "honorarios"
  | "comision"
  | "caja_chica"
  | "otros";

export type UnidadNegocioGasto =
  | "alojamiento"
  | "confiteria"
  | "evento"
  | "compartido"
  | "no_operativo";

export type FormaPago = "efectivo" | "transferencia" | "tarjeta" | "cuenta_corriente";

export type TipoPago = "gasto_operativo" | "inversion" | "retiro_familiar";

export type TipoComprobante =
  | "sin_comprobante"
  | "factura_a"
  | "factura_b"
  | "factura_c"
  | "ticket"
  | "recibo";

export interface GastoRow {
  id: number;
  fecha_operacion: string;
  rubro_proveedor: string;
  detalle_compra: string;
  categoria: CategoriaGasto;
  unidad_negocio: UnidadNegocioGasto;
  forma_pago: FormaPago;
  tipo_pago: TipoPago;
  monto: number;
  tipo_comprobante: TipoComprobante | null;
  numero_comprobante: string | null;
  observaciones: string | null;
  created_by: string | null;
  created_by_name: string;
  created_at: string;
}

export type FormaCobro =
  | "efectivo"
  | "transferencia"
  | "tarjeta"
  | "digital_billetera"
  | "plataforma"
  | "otros";

export interface VentaRow {
  id: number;
  fecha_operacion: string;
  monto_alojamiento: number;
  monto_confiteria: number;
  monto_eventos: number;
  monto_otros: number;
  detalles: string | null;
  forma_cobro: FormaCobro;
  tiene_comprobante: boolean;
  numero_comprobante: string | null;
  tipo_comprobante: TipoComprobante | null;
  observaciones: string | null;
  created_by: string | null;
  created_by_name: string;
  created_at: string;
}
