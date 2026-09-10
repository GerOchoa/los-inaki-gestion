import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// Sólo /dashboard requiere sesión (admin). Los formularios son públicos:
// se comparte el link a empleados sin darles usuario/clave.
const PROTECTED_PATHS = ["/dashboard"];

export async function proxy(request: NextRequest) {
  const { response, user } = await updateSession(request);

  const { pathname } = request.nextUrl;
  const isProtected = PROTECTED_PATHS.some((p) => pathname.startsWith(p));

  // No autenticado intentando entrar a una ruta protegida -> a /login.
  if (!user && isProtected) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // Autenticado intentando ver /login -> lo mandamos a la home (que decide
  // a dónde corresponde según su rol).
  if (user && pathname.startsWith("/login")) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Corre en todas las rutas menos assets estáticos y de Next.
     * El control fino de "admin vs empleado" para /dashboard se hace en la
     * propia página (server component) consultando profiles + RLS, no acá.
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
