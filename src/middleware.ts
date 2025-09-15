import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Routes qui nécessitent une authentification admin
const adminRoutes = ["/administration", "/dashboard", "/api/private", "/test"];

// Routes qui nécessitent une authentification FranceConnect (particulier)
const particulierRoutes = ["/mon-compte"];

// Routes qui ne doivent pas être accessibles si déjà connecté
const authRoutes = ["/connexion"];

// Routes API FranceConnect (publiques)
const fcApiRoutes = [
  "/api/auth/fc/callback",
  "/api/auth/fc/login",
  "/oidc-callback",
];

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Ne pas intercepter les routes API FranceConnect
  if (fcApiRoutes.some((route) => path.startsWith(route))) {
    return NextResponse.next();
  }

  // Vérifier si c'est une route protégée
  const isAdminRoute = adminRoutes.some((route) => path.startsWith(route));
  const isParticulierRoute = particulierRoutes.some((route) =>
    path.startsWith(route)
  );
  const isProtectedRoute = isAdminRoute || isParticulierRoute;
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

  // Si on a une session, vérifier les permissions par rôle
  if (session) {
    // Optimisation : récupérer le rôle depuis un cookie dédié
    const userRole = request.cookies.get("session_role")?.value;

    // Si pas de cookie de rôle, essayer de décoder le JWT (rétrocompatibilité)
    let role = userRole;

    if (!role) {
      try {
        const payload = JSON.parse(
          Buffer.from(session.split(".")[1], "base64url").toString()
        );
        role = payload.user?.role;
      } catch (error) {
        // Session invalide
        console.error("Erreur décodage JWT:", error);

        if (isProtectedRoute) {
          const response = NextResponse.redirect(
            new URL("/connexion", request.url)
          );
          response.cookies.delete("session");
          response.cookies.delete("session_role");
          response.cookies.delete("session_auth");
          return response;
        }
      }
    }

    // Vérifier les permissions selon le rôle
    if (role) {
      if (isAdminRoute && role !== "admin") {
        // Un particulier essaie d'accéder à l'admin -> rediriger vers son espace
        return NextResponse.redirect(new URL("/mon-compte", request.url));
      }

      if (isParticulierRoute && role !== "particulier") {
        // Un admin essaie d'accéder à l'espace particulier -> rediriger vers admin
        return NextResponse.redirect(new URL("/administration", request.url));
      }

      // Si route d'auth et session existe -> rediriger vers le bon espace
      if (isAuthRoute) {
        // Vérifier s'il y a une URL de redirection sauvegardée
        const redirectTo = request.cookies.get("redirectTo")?.value;

        if (redirectTo) {
          // Supprimer le cookie redirectTo et rediriger
          const response = NextResponse.redirect(
            new URL(redirectTo, request.url)
          );
          response.cookies.delete("redirectTo");
          return response;
        }

        // Sinon redirection par défaut selon le rôle
        const defaultRedirect =
          role === "admin" ? "/administration" : "/mon-compte";
        return NextResponse.redirect(new URL(defaultRedirect, request.url));
      }
    }
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
