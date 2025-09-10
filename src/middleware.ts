import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Routes qui nécessitent une authentification
const protectedRoutes = [
  "/administration",
  "/dashboard",
  "/mon-compte",
  "/statistiques",
  "/test", // Pages de test

  "/api/private", // Route API privées si besoin
];

// Routes qui ne doivent pas être accessibles si déjà connecté
const authRoutes = ["/connexion"];

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  const isProtectedRoute = protectedRoutes.some((route) =>
    path.startsWith(route)
  );

  const isAuthRoute = authRoutes.some((route) => path.startsWith(route));

  // Récupérer le cookie de session
  const session = request.cookies.get("session")?.value;

  // Si route protégée et pas de session -> rediriger vers connexion
  if (isProtectedRoute && !session) {
    const response = NextResponse.redirect(new URL("/connexion", request.url));

    // Sauvegarder l'URL demandée pour rediriger après connexion
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
    // Vérifier s'il y a une URL de redirection sauvegardée
    const redirectTo = request.cookies.get("redirectTo")?.value;

    if (redirectTo) {
      // Supprimer le cookie redirectTo et rediriger vers l'URL sauvegardée
      const response = NextResponse.redirect(new URL(redirectTo, request.url));
      response.cookies.delete("redirectTo");
      return response;
    }

    // Sinon redirection par défaut vers administration
    return NextResponse.redirect(new URL("/administration", request.url));
  }

  return NextResponse.next();
}

// Configuration du middleware
export const config = {
  matcher: [
    /*
     * Match toutes les routes SAUF :
     * - _next/static (fichiers statiques)
     * - _next/image (optimisation d'images)
     * - favicon.ico, sitemap.xml, robots.txt
     * - fichiers images et fonts
     */
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:png|jpg|jpeg|svg|gif|ico|webp|woff|woff2)$).*)",
  ],
};
