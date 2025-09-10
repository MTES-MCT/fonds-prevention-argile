import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Routes qui nécessitent une authentification
const protectedRoutes = ["/administration", "/test", "/api/private"];

// Routes qui ne doivent pas être accessibles si déjà connecté
const authRoutes = ["/login"];

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  const isProtectedRoute = protectedRoutes.some((route) =>
    path.startsWith(route)
  );

  const isAuthRoute = authRoutes.some((route) => path.startsWith(route));

  // Récupérer le cookie de session
  const session = request.cookies.get("session")?.value;

  // Si route protégée et pas de session -> rediriger vers login
  if (isProtectedRoute && !session) {
    const response = NextResponse.redirect(new URL("/login", request.url));
    // Sauvegarde de l'URL demandée pour rediriger après login
    response.cookies.set("redirectTo", path, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 5, // 5 minutes
    });
    return response;
  }

  // Si route d'auth et session existe -> rediriger vers administration
  if (isAuthRoute && session) {
    return NextResponse.redirect(new URL("/administration", request.url));
  }

  return NextResponse.next();
}

// Configuration du middleware
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\..*|public).*)",
  ],
};
