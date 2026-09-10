"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { validateGasto, type GastoInput, type ValidationErrors } from "@/lib/validation";

export interface GastoFormState {
  errors?: ValidationErrors;
  formError?: string;
  success?: boolean;
}

export async function submitGasto(
  _prevState: GastoFormState,
  formData: FormData
): Promise<GastoFormState> {
  const input: GastoInput = {
    created_by_name: String(formData.get("created_by_name") || ""),
    fecha_operacion: String(formData.get("fecha_operacion") || ""),
    rubro_proveedor: String(formData.get("rubro_proveedor") || ""),
    detalle_compra: String(formData.get("detalle_compra") || ""),
    categoria: String(formData.get("categoria") || ""),
    unidad_negocio: String(formData.get("unidad_negocio") || ""),
    forma_pago: String(formData.get("forma_pago") || ""),
    tipo_pago: String(formData.get("tipo_pago") || ""),
    monto: String(formData.get("monto") || ""),
    tipo_comprobante: String(formData.get("tipo_comprobante") || ""),
    numero_comprobante: String(formData.get("numero_comprobante") || ""),
    observaciones: String(formData.get("observaciones") || ""),
  };

  const { ok, errors } = validateGasto(input);
  if (!ok) {
    return { errors };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("gastos").insert({
    created_by_name: input.created_by_name.trim(),
    fecha_operacion: input.fecha_operacion,
    rubro_proveedor: input.rubro_proveedor.trim(),
    detalle_compra: input.detalle_compra.trim(),
    categoria: input.categoria,
    unidad_negocio: input.unidad_negocio,
    forma_pago: input.forma_pago,
    tipo_pago: input.tipo_pago,
    monto: Number(input.monto.replace(",", ".")),
    tipo_comprobante: input.tipo_comprobante || null,
    numero_comprobante: input.numero_comprobante.trim() || null,
    observaciones: input.observaciones.trim() || null,
    created_by: user?.id ?? null,
  });

  if (error) {
    return { formError: "No se pudo guardar el gasto. Intentá de nuevo." };
  }

  return { success: true };
}
