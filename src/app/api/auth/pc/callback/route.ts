import { NextRequest, NextResponse } from "next/server";
import {
  handleProConnectCallback,
  handleProConnectError,
} from "@/features/auth/adapters/proconnect/proconnect.service";
import { getAndClearRedirectUrl } from "@/features/auth";
import { DEFAULT_REDIRECTS, ROUTES } from "@/features/auth/domain/value-objects/configs/routes.config";
import { getServerEnv } from "@/shared/config/env.config";

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
      // Erreurs de sécurité → déconnexion immédiate
      if (result.shouldLogout) {
        return NextResponse.redirect(new URL(`${ROUTES.connexion.agent}?error=pc_security_error`, baseUrl));
      }

      return NextResponse.redirect(new URL(`${ROUTES.connexion.agent}?error=${result.error}`, baseUrl));
    }

    // Récupérer l'URL de redirection sauvegardée (si existe)
    const redirectUrl = await getAndClearRedirectUrl();
    const finalRedirect = redirectUrl || DEFAULT_REDIRECTS.administrateur;

    return NextResponse.redirect(new URL(finalRedirect, baseUrl));
  } catch (err) {
    console.error("Erreur lors du callback ProConnect:", err);
    return NextResponse.redirect(new URL(`${ROUTES.connexion.agent}?error=pc_auth_failed`, baseUrl));
  }
}
