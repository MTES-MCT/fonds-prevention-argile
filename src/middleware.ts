import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  COOKIE_NAMES,
  PUBLIC_ROUTES,
  DEFAULT_REDIRECTS,
  isProtectedRoute,
  canAccessRoute,
  getDefaultRedirect,
  isValidRole,
  getCookieOptions,
  SESSION_DURATION,
} from "./lib/auth/edge";

import { decodeToken } from "./lib/auth/utils/jwt-decode.utils";

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Ne pas intercepter les routes API FranceConnect
  if (PUBLIC_ROUTES.franceConnectApi.some((route) => path.startsWith(route))) {
    return NextResponse.next();
  }

  // Vérifier le type de route
  const isProtected = isProtectedRoute(path);
  const isAuthRoute = PUBLIC_ROUTES.auth.some((route) =>
    path.startsWith(route)
  );

  // Récupérer le cookie de session
  const session = request.cookies.get(COOKIE_NAMES.SESSION)?.value;

  // Si route protégée et pas de session -> rediriger vers connexion
  if (isProtected && !session) {
    const response = NextResponse.redirect(
      new URL(DEFAULT_REDIRECTS.login, request.url)
    );

    // Sauvegarder l'URL demandée pour rediriger après connexion
    response.cookies.set(
      COOKIE_NAMES.REDIRECT_TO,
      path,
      getCookieOptions(SESSION_DURATION.redirectCookie)
    );

    return response;
  }

  // Si on a une session, vérifier les permissions
  if (session) {
    // Récupérer le rôle depuis un cookie dédié
    let role = request.cookies.get(COOKIE_NAMES.SESSION_ROLE)?.value;

    // Si pas de cookie de rôle, décoder le JWT (rétrocompatibilité)
    if (!role) {
      const payload = decodeToken(session);
      role = payload?.role;

      if (!role && isProtected) {
        // Session invalide - nettoyer et rediriger
        const response = NextResponse.redirect(
          new URL(DEFAULT_REDIRECTS.login, request.url)
        );

        // Nettoyer tous les cookies de session
        response.cookies.delete(COOKIE_NAMES.SESSION);
        response.cookies.delete(COOKIE_NAMES.SESSION_ROLE);
        response.cookies.delete(COOKIE_NAMES.SESSION_AUTH);

        return response;
      }
    }

    // Vérifier les permissions selon le rôle
    if (role && isValidRole(role)) {
      // Vérifier l'accès à la route
      if (!canAccessRoute(path, role)) {
        // Rediriger vers l'espace approprié
        const redirect = getDefaultRedirect(role);
        return NextResponse.redirect(new URL(redirect, request.url));
      }

      // Si route d'auth et session existe -> rediriger vers le bon espace
      if (isAuthRoute) {
        // Vérifier s'il y a une URL de redirection sauvegardée
        const redirectTo = request.cookies.get(COOKIE_NAMES.REDIRECT_TO)?.value;

        if (redirectTo) {
          // Supprimer le cookie redirectTo et rediriger
          const response = NextResponse.redirect(
            new URL(redirectTo, request.url)
          );
          response.cookies.delete(COOKIE_NAMES.REDIRECT_TO);
          return response;
        }

        // Sinon redirection par défaut selon le rôle
        const defaultRedirect = getDefaultRedirect(role);
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
