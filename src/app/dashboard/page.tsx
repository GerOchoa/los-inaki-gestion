import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { gastosToRows, ventasToRows } from "@/lib/dashboard/transform";
import type { GastoRow, VentaRow } from "@/lib/types";
import DashboardWidget from "./DashboardWidget";

// Siempre se renderiza en el servidor con datos frescos de Supabase (nada
// de caché estática): es un tablero gerencial, tiene que reflejar lo que
// se cargó recién.
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  // Defensa en profundidad: además de esto, RLS impide que un no-admin
  // pueda hacer select sobre gastos/ventas aunque se salteara esta pantalla.
  if (profile?.role !== "admin") {
    redirect("/formularios/gasto");
  }

  const [{ data: gastos, error: gastosError }, { data: ventas, error: ventasError }] =
    await Promise.all([
      supabase.from("gastos").select("*").order("fecha_operacion", { ascending: false }),
      supabase.from("ventas").select("*").order("fecha_operacion", { ascending: false }),
    ]);

  if (gastosError || ventasError) {
    return (
      <div className="wrap">
        <div className="form-error">
          No se pudieron cargar los datos del tablero. Probá recargar la página en unos segundos.
        </div>
      </div>
    );
  }

  const rowsGastos = gastosToRows((gastos as GastoRow[]) || []);
  const rowsVentas = ventasToRows((ventas as VentaRow[]) || []);
  const lastUpdated = new Date().toLocaleString("es-AR");

  return <DashboardWidget ventas={rowsVentas} gastos={rowsGastos} lastUpdated={lastUpdated} />;
}
