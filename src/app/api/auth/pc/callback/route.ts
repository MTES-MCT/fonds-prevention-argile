import { DEFAULT_REDIRECTS, getAndClearRedirectUrl } from "@/features/auth";
import {
  handleProConnectCallback,
  handleProConnectError,
} from "@/features/auth/adapters/proconnect/proconnect.service";
import { getServerEnv } from "@/shared/config/env.config";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/auth/pc/callback
 * Traite le retour de ProConnect après authentification
 */
export async function GET(request: NextRequest) {
  const baseUrl = getServerEnv().BASE_URL;
  const searchParams = request.nextUrl.searchParams;

  const redirectTo = (path: string) => {
    return NextResponse.redirect(new URL(path, baseUrl));
  };

  try {
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");
    const errorDescription = searchParams.get("error_description");

    if (error) {
      const result = handleProConnectError(error, errorDescription || "");
      return redirectTo(`/connexion/administration?error=${result.code}&message=${encodeURIComponent(result.error)}`);
    }

    if (!code || !state) {
      console.error("Paramètres manquants", { code: !!code, state: !!state });
      return redirectTo("/connexion/administration?error=pc_missing_params");
    }

    const result = await handleProConnectCallback(code, state);

    if (result.success) {
      const savedRedirectUrl = await getAndClearRedirectUrl();
      return redirectTo(savedRedirectUrl || DEFAULT_REDIRECTS.admin);
    }

    if (result.shouldLogout) {
      console.error("Échec de sécurité ProConnect:", result.error);
      return redirectTo("/connexion/administration?error=pc_security_error");
    }

    let errorParam = "pc_auth_failed";
    let errorMessage = "";

    if (result.error?.includes("token")) {
      errorParam = "pc_token_error";
      errorMessage = "Erreur lors de l'échange de token";
    } else if (result.error?.includes("utilisateur")) {
      errorParam = "pc_userinfo_error";
      errorMessage = "Impossible de récupérer les informations utilisateur";
    } else if (result.error?.includes("annulé")) {
      errorParam = "pc_cancelled";
      errorMessage = "Connexion annulée";
    }

    return redirectTo(
      `/connexion/admin?error=${errorParam}${errorMessage ? `&message=${encodeURIComponent(errorMessage)}` : ""}`
    );
  } catch (error) {
    console.error("Erreur inattendue dans le callback ProConnect:", error);
    return redirectTo("/connexion/administration?error=pc_server_error");
  }
}
