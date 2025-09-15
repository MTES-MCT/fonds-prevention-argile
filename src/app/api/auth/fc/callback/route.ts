import { NextRequest, NextResponse } from "next/server";
import { handleFranceConnectCallback } from "@/lib/auth/franceconnect";

/**
 * GET /api/auth/fc/callback
 * Traite le retour de FranceConnect après authentification
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // Récupération des paramètres de retour
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");
    const errorDescription = searchParams.get("error_description");

    // Gestion des erreurs FranceConnect
    if (error) {
      console.error("Erreur FranceConnect:", error, errorDescription);

      // Rediriger avec message d'erreur approprié
      let errorMessage = "fc_error";
      if (error === "access_denied") {
        errorMessage = "fc_cancelled";
      } else if (error === "server_error") {
        errorMessage = "fc_server_error";
      }

      return NextResponse.redirect(
        new URL(`/connexion?error=${errorMessage}`, request.url)
      );
    }

    // Vérification des paramètres obligatoires
    if (!code || !state) {
      console.error("Paramètres manquants:", { code: !!code, state: !!state });
      return NextResponse.redirect(
        new URL("/connexion?error=fc_missing_params", request.url)
      );
    }

    // Traitement du callback
    const result = await handleFranceConnectCallback(code, state);

    if (result.success) {
      // Succès : page mon-compte
      return NextResponse.redirect(new URL("/mon-compte", request.url));
    } else {
      // Échec : rediriger vers connexion avec erreur
      console.error("Échec du callback:", result.error);

      let errorParam = "fc_auth_failed";
      if (result.error?.includes("État de sécurité invalide")) {
        errorParam = "fc_invalid_state";
      } else if (result.error?.includes("token")) {
        errorParam = "fc_token_error";
      }

      return NextResponse.redirect(
        new URL(`/connexion?error=${errorParam}`, request.url)
      );
    }
  } catch (error) {
    console.error("Erreur inattendue dans le callback:", error);

    // Erreur serveur : rediriger vers connexion
    return NextResponse.redirect(
      new URL("/connexion?error=fc_server_error", request.url)
    );
  }
}
