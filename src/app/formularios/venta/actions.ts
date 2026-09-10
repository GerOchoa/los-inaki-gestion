"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { validateVenta, type VentaInput, type ValidationErrors } from "@/lib/validation";

export interface VentaFormState {
  errors?: ValidationErrors;
  formError?: string;
  success?: boolean;
}

function toNumber(v: string): number {
  if (!v) return 0;
  const n = Number(v.replace(",", "."));
  return Number.isNaN(n) ? 0 : n;
}

export async function submitVenta(
  _prevState: VentaFormState,
  formData: FormData
): Promise<VentaFormState> {
  const input: VentaInput = {
    created_by_name: String(formData.get("created_by_name") || ""),
    fecha_operacion: String(formData.get("fecha_operacion") || ""),
    monto_alojamiento: String(formData.get("monto_alojamiento") || ""),
    monto_confiteria: String(formData.get("monto_confiteria") || ""),
    monto_eventos: String(formData.get("monto_eventos") || ""),
    monto_otros: String(formData.get("monto_otros") || ""),
    detalles: String(formData.get("detalles") || ""),
    forma_cobro: String(formData.get("forma_cobro") || ""),
    tiene_comprobante: String(formData.get("tiene_comprobante") || ""),
    numero_comprobante: String(formData.get("numero_comprobante") || ""),
    tipo_comprobante: String(formData.get("tipo_comprobante") || ""),
    observaciones: String(formData.get("observaciones") || ""),
  };

  const { ok, errors } = validateVenta(input);
  if (!ok) {
    return { errors };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("ventas").insert({
    created_by_name: input.created_by_name.trim(),
    fecha_operacion: input.fecha_operacion,
    monto_alojamiento: toNumber(input.monto_alojamiento),
    monto_confiteria: toNumber(input.monto_confiteria),
    monto_eventos: toNumber(input.monto_eventos),
    monto_otros: toNumber(input.monto_otros),
    detalles: input.detalles.trim() || null,
    forma_cobro: input.forma_cobro,
    tiene_comprobante: input.tiene_comprobante === "si",
    numero_comprobante: input.numero_comprobante.trim() || null,
    tipo_comprobante: input.tipo_comprobante || null,
    observaciones: input.observaciones.trim() || null,
    created_by: user?.id ?? null,
  });

  if (error) {
    return { formError: "No se pudo guardar la venta. Intentá de nuevo." };
  }

  return { success: true };
}
