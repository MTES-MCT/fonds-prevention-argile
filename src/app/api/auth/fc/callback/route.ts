import { NextRequest, NextResponse } from "next/server";
import {
  handleFranceConnectCallback,
  DEFAULT_REDIRECTS,
  getAndClearRedirectUrl,
  handleFranceConnectError,
} from "@/lib/auth/server";
import { getServerEnv } from "@/lib/config/env.config";

/**
 * GET /api/auth/fc/callback
 * Traite le retour de FranceConnect après authentification
 */
export async function GET(request: NextRequest) {
  const baseUrl = getServerEnv().BASE_URL;
  const searchParams = request.nextUrl.searchParams;

  // Helper pour créer une URL de redirection
  const redirectTo = (path: string) =>
    NextResponse.redirect(new URL(path, baseUrl));

  try {
    // Extraction des paramètres
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    // Gestion des erreurs FranceConnect
    if (error) {
      const errorDescription = searchParams.get("error_description");
      const result = handleFranceConnectError(error, errorDescription || "");

      return redirectTo(
        `/connexion?error=${result.code}&message=${encodeURIComponent(result.error)}`
      );
    }

    // Vérification des paramètres requis
    if (!code || !state) {
      console.error("Paramètres manquants", { code: !!code, state: !!state });
      return redirectTo("/connexion?error=fc_missing_params");
    }

    // Traitement du callback
    const result = await handleFranceConnectCallback(code, state);

    if (result.success) {
      // Récupérer l'URL de redirection sauvegardée
      const savedRedirectUrl = await getAndClearRedirectUrl();

      // Rediriger vers l'URL demandée ou l'espace particulier par défaut
      return redirectTo(savedRedirectUrl || DEFAULT_REDIRECTS.particulier);
    }

    // Gestion des erreurs spécifiques
    let errorParam = "fc_auth_failed";
    if (result.error?.includes("État de sécurité invalide")) {
      errorParam = "fc_invalid_state";
    } else if (result.error?.includes("token")) {
      errorParam = "fc_token_error";
    } else if (result.error?.includes("annulé")) {
      errorParam = "fc_cancelled";
    }

    return redirectTo(`/connexion?error=${errorParam}`);
  } catch (error) {
    console.error("Erreur inattendue dans le callback:", error);
    return redirectTo("/connexion?error=fc_server_error");
  }
}
