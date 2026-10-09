import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Tous les imports depuis edge.ts
import {
  COOKIE_NAMES,
  PUBLIC_ROUTES,
  DEFAULT_REDIRECTS,
  SESSION_DURATION,
  getCookieOptions,
  decodeToken,
  isValidRole,
  isProtectedRoute,
  getDefaultRedirect,
  ROUTES,
  estSessionConforme,
} from "@/features/auth/edge";
import { UserRole } from "@/shared/domain/value-objects";

/**
 * Middleware de gestion de l'authentification
 *
 * Responsabilités :
 * - Vérifier que l'utilisateur est authentifié (session valide)
 * - Rediriger vers la page de connexion si non authentifié
 * - Rediriger les utilisateurs connectés hors des pages de connexion
 *
 * Note : Les autorisations (rôles) sont gérées par les pages elles-mêmes
 * via les composants AccesNonAutorise pour une meilleure UX
 */
export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Ne pas intercepter les routes API FranceConnect
  if (PUBLIC_ROUTES.franceConnectApi.some((route) => path.startsWith(route))) {
    return NextResponse.next();
  }

  // Ne pas intercepter les routes API ProConnect
  if (PUBLIC_ROUTES.proConnectApi.some((route) => path.startsWith(route))) {
    return NextResponse.next();
  }

  // Vérifier le type de route
  const isProtected = isProtectedRoute(path);
  const isAuthRoute = PUBLIC_ROUTES.auth.some((route) => path.startsWith(route));

  // Récupérer le cookie de session
  const session = request.cookies.get(COOKIE_NAMES.SESSION)?.value;

  // Si route protégée et pas de session -> rediriger vers connexion
  if (isProtected && !session) {
    return redirigerVersConnexion(request, path);
  }

  // Si on a une session, gérer les redirections
  if (session) {
    // Décodage non vérifié : il écarte une session sans preuve MFA, il n'en authentifie aucune.
    const payload = decodeToken(session);
    if (!estSessionConforme(payload)) {
      return effacerSession(isProtected ? redirigerVersConnexion(request, path) : NextResponse.next());
    }

    // Récupérer le rôle depuis un cookie dédié, sinon depuis le JWT (rétrocompatibilité)
    const role = request.cookies.get(COOKIE_NAMES.SESSION_ROLE)?.value ?? payload?.role;

    if (!role && isProtected) {
      return effacerSession(NextResponse.redirect(new URL(DEFAULT_REDIRECTS.login, request.url)));
    }

    // Si route d'auth et session existe -> rediriger vers le bon espace
    if (isAuthRoute && role && isValidRole(role)) {
      // Vérifier s'il y a une URL de redirection sauvegardée
      const redirectTo = request.cookies.get(COOKIE_NAMES.REDIRECT_TO)?.value;

      if (redirectTo) {
        // Vérifier que la redirection est compatible avec le rôle
        const isAmoRole = role === UserRole.AMO;
        const isAdminRoute = redirectTo.startsWith(ROUTES.backoffice.administration.root);

        if (isAmoRole && isAdminRoute) {
          // AMO tentant d'accéder à /administration -> rediriger vers espace-amo
          const response = NextResponse.redirect(new URL(ROUTES.backoffice.espaceAgent.root, request.url));
          response.cookies.delete(COOKIE_NAMES.REDIRECT_TO);
          return response;
        }

        // Supprimer le cookie redirectTo et rediriger
        const response = NextResponse.redirect(new URL(redirectTo, request.url));
        response.cookies.delete(COOKIE_NAMES.REDIRECT_TO);
        return response;
      }

      // Sinon redirection par défaut selon le rôle
      const defaultRedirect = getDefaultRedirect(role);
      return NextResponse.redirect(new URL(defaultRedirect, request.url));
    }

    // Si session valide alors laisser passer les pages géreront elles-mêmes les autorisations (rôles)
  }

  return NextResponse.next();
}

function redirigerVersConnexion(request: NextRequest, path: string): NextResponse {
  const isBackofficeRoute =
    path.startsWith(ROUTES.backoffice.administration.root) || path.startsWith(ROUTES.backoffice.espaceAgent.root);
  const loginUrl = isBackofficeRoute ? ROUTES.connexion.agent : ROUTES.connexion.particulier;

  const response = NextResponse.redirect(new URL(loginUrl, request.url));

  // Sauvegarder l'URL demandée pour rediriger après connexion
  response.cookies.set(COOKIE_NAMES.REDIRECT_TO, path, getCookieOptions(SESSION_DURATION.redirectCookie));

  return response;
}

function effacerSession(response: NextResponse): NextResponse {
  response.cookies.delete(COOKIE_NAMES.SESSION);
  response.cookies.delete(COOKIE_NAMES.SESSION_ROLE);
  response.cookies.delete(COOKIE_NAMES.SESSION_AUTH);
  return response;
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
