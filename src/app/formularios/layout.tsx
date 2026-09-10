import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function FormulariosLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let isAdmin = false;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    isAdmin = profile?.role === "admin";
  }

  return (
    <div className="wrap">
      <div className="hero" style={{ marginBottom: 8 }}>
        <div className="topline">
          <div>
            <h1 style={{ fontSize: 24 }}>Los Iñaki — Carga de datos</h1>
            <p className="sub">Cargá tus gastos y ventas del día.</p>
          </div>
          {user ? (
            <form action="/auth/signout" method="post">
              <button className="btn light" type="submit">
                Cerrar sesión
              </button>
            </form>
          ) : (
            <Link className="btn light" href="/login">
              Acceso admin
            </Link>
          )}
        </div>
      </div>

      <div className="nav" style={{ margin: "16px 0" }}>
        <div className="nav-links">
          <Link className="nav-link" href="/formularios/gasto">
            Cargar gasto
          </Link>
          <Link className="nav-link" href="/formularios/venta">
            Cargar venta
          </Link>
          {isAdmin && (
            <Link className="nav-link" href="/dashboard">
              Ver tablero
            </Link>
          )}
        </div>
      </div>

      {children}
    </div>
  );
}
