import {
  DEFAULT_REDIRECTS,
  getAndClearRedirectUrl,
  handleFranceConnectCallback,
  handleFranceConnectError,
} from "@/features/auth";
import { getServerEnv } from "@/shared/config/env.config";
import { normalizePartnerSlug } from "@/shared/domain/partners";
import { NextRequest, NextResponse } from "next/server";

const PARTNER_COOKIE_NAME = "partner_source";

/**
 * GET /api/auth/fc/callback
 * Traite le retour de FranceConnect après authentification
 */
export async function GET(request: NextRequest) {
  const baseUrl = getServerEnv().BASE_URL;
  const searchParams = request.nextUrl.searchParams;

  // Helper pour créer une URL de redirection
  const redirectTo = (path: string) => {
    return NextResponse.redirect(new URL(path, baseUrl));
  };

  try {
    // Extraction des paramètres
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");
    const errorDescription = searchParams.get("error_description");

    // Gestion des erreurs FranceConnect
    if (error) {
      const result = handleFranceConnectError(error, errorDescription || "");

      // Redirection vers accueil en cas d'erreur (comme demandé par FC)
      return redirectTo(`/?error=${result.code}&message=${encodeURIComponent(result.error)}`);
    }

    // Vérification des paramètres requis
    if (!code || !state) {
      console.error("Paramètres manquants", { code: !!code, state: !!state });
      // Redirection vers accueil pour sécurité
      return redirectTo("/?error=fc_missing_params");
    }

    // Phase B : récupérer le partenaire depuis le cookie posé sur /connexion (sera consommé une fois)
    const partnerSource = normalizePartnerSlug(request.cookies.get(PARTNER_COOKIE_NAME)?.value);

    // Traitement du callback
    const result = await handleFranceConnectCallback(code, state, { partnerSource });

    if (result.success) {
      // Récupérer l'URL de redirection sauvegardée
      const savedRedirectUrl = await getAndClearRedirectUrl();

      // Rediriger vers l'URL demandée ou l'espace particulier par défaut
      const response = redirectTo(savedRedirectUrl || DEFAULT_REDIRECTS.particulier);

      // Nettoyer le cookie partner après consommation (évite re-application sur login ultérieur)
      if (partnerSource) {
        response.cookies.delete(PARTNER_COOKIE_NAME);
      }

      return response;
    }

    // Gestion des échecs de sécurité (state/nonce invalides)
    if (result.shouldLogout) {
      console.error("Échec de sécurité FranceConnect:", result.error);

      // TODO gérer la remontée d'erreur côté front si besoin
      return redirectTo("/");
    }

    // Gestion des autres erreurs (non sécurité)
    let errorParam = "fc_auth_failed";
    let errorMessage = "";

    if (result.error?.includes("token")) {
      errorParam = "fc_token_error";
      errorMessage = "Erreur lors de l'échange de token";
    } else if (result.error?.includes("utilisateur")) {
      errorParam = "fc_userinfo_error";
      errorMessage = "Impossible de récupérer les informations utilisateur";
    } else if (result.error?.includes("annulé")) {
      errorParam = "fc_cancelled";
      errorMessage = "Connexion annulée";
    }

    // Pour les erreurs non-sécurité, on peut rediriger vers connexion
    return redirectTo(
      `/connexion?error=${errorParam}${errorMessage ? `&message=${encodeURIComponent(errorMessage)}` : ""}`
    );
  } catch (error) {
    console.error("Erreur inattendue dans le callback FranceConnect:", error);

    // En cas d'erreur serveur, redirection vers accueil par sécurité
    return redirectTo("/?error=fc_server_error");
  }
}
