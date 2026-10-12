import { NextRequest, NextResponse } from "next/server";
import {
  handleProConnectCallback,
  handleProConnectError,
} from "@/features/auth/adapters/proconnect/proconnect.service";
import { getAndClearRedirectUrl } from "@/features/auth";
import { getDefaultRedirect } from "@/features/auth/services/redirects.service";
import { DEFAULT_REDIRECTS, ROUTES } from "@/features/auth/domain/value-objects/configs/routes.config";
import { getServerEnv } from "@/shared/config/env.config";
import { COOKIE_NAMES } from "@/features/auth/domain/value-objects";

// Un refus ne doit laisser derrière lui aucune session antérieure exploitable.
function redirigerVersConnexion(errorCode: string, baseUrl: string): NextResponse {
  const response = NextResponse.redirect(new URL(`${ROUTES.connexion.agent}?error=${errorCode}`, baseUrl));
  response.cookies.delete(COOKIE_NAMES.SESSION);
  response.cookies.delete(COOKIE_NAMES.SESSION_ROLE);
  response.cookies.delete(COOKIE_NAMES.SESSION_AUTH);
  return response;
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  // Utiliser BASE_URL pour les redirections serveur
  const baseUrl = getServerEnv().BASE_URL;

  // Gestion des erreurs ProConnect (user cancellation, etc.)
  if (error) {
    const { code: errorCode } = handleProConnectError(error, errorDescription || undefined);
    return NextResponse.redirect(new URL(`${ROUTES.connexion.agent}?error=${errorCode}`, baseUrl));
  }

  // Vérification des paramètres requis
  if (!code || !state) {
    return NextResponse.redirect(new URL(`${ROUTES.connexion.agent}?error=pc_missing_params`, baseUrl));
  }

  try {
    const result = await handleProConnectCallback(code, state);

    if (!result.success) {
      if (result.code) {
        return redirigerVersConnexion(result.code, baseUrl);
      }

      // Erreurs de sécurité → déconnexion immédiate
      if (result.shouldLogout) {
        return redirigerVersConnexion("pc_security_error", baseUrl);
      }

      // Déterminer le code d'erreur approprié
      const errorCode =
        result.error?.includes("non autorisé") || result.error?.includes("non enregistré")
          ? "pc_unauthorized"
          : "pc_auth_failed";

      return redirigerVersConnexion(errorCode, baseUrl);
    }

    // URL intentionnelle prioritaire ; sinon redirection par défaut selon le rôle
    // (agents terrain AMO/AV → dossiers, admins/analystes → administration).
    const redirectUrl = await getAndClearRedirectUrl();
    const finalRedirect =
      redirectUrl || (result.role ? getDefaultRedirect(result.role) : DEFAULT_REDIRECTS.administrateur);

    return NextResponse.redirect(new URL(finalRedirect, baseUrl));
  } catch (err) {
    console.error("Erreur lors du callback ProConnect:", err);
    return redirigerVersConnexion("pc_auth_failed", baseUrl);
  }
}
