import { NextRequest, NextResponse } from "next/server";
import { handleFranceConnectCallback } from "@/lib/auth/franceconnect";
import { getServerEnv } from "@/lib/config/env.config";

// Mapping des erreurs FranceConnect vers nos codes d'erreur
const ERROR_MAPPING: Record<string, string> = {
  access_denied: "fc_cancelled",
  server_error: "fc_server_error",
  temporarily_unavailable: "fc_server_error",
  invalid_request: "fc_invalid_request",
  unauthorized_client: "fc_unauthorized",
};

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
      console.error(`Erreur FranceConnect: ${error}`, errorDescription);

      const errorCode = ERROR_MAPPING[error] || "fc_error";
      return redirectTo(`/connexion?error=${errorCode}`);
    }

    // Vérification des paramètres requis
    if (!code || !state) {
      console.error("Paramètres manquants", { code: !!code, state: !!state });
      return redirectTo("/connexion?error=fc_missing_params");
    }

    // Traitement du callback
    const result = await handleFranceConnectCallback(code, state);

    if (result.success) {
      return redirectTo("/mon-compte");
    }

    // Gestion des erreurs spécifiques
    let errorParam = "fc_auth_failed";
    if (result.error?.includes("État de sécurité invalide")) {
      errorParam = "fc_invalid_state";
    } else if (result.error?.includes("token")) {
      errorParam = "fc_token_error";
    }

    return redirectTo(`/connexion?error=${errorParam}`);
  } catch (error) {
    console.error("Erreur inattendue dans le callback:", error);
    return redirectTo("/connexion?error=fc_server_error");
  }
}
