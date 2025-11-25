import { NextRequest, NextResponse } from "next/server";
import {
  handleProConnectCallback,
  handleProConnectError,
} from "@/features/auth/adapters/proconnect/proconnect.service";
import { getAndClearRedirectUrl } from "@/features/auth";
import { DEFAULT_REDIRECTS } from "@/features/auth/domain/value-objects/configs/routes.config";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  // Gestion des erreurs ProConnect (user cancellation, etc.)
  if (error) {
    const { code: errorCode } = handleProConnectError(error, errorDescription || undefined);
    return NextResponse.redirect(new URL(`/connexion/agent?error=${errorCode}`, request.url));
  }

  // Vérification des paramètres requis
  if (!code || !state) {
    return NextResponse.redirect(new URL("/connexion/agent?error=pc_missing_params", request.url));
  }

  try {
    const result = await handleProConnectCallback(code, state);

    if (!result.success) {
      // Erreurs de sécurité → déconnexion immédiate
      if (result.shouldLogout) {
        return NextResponse.redirect(new URL("/connexion/agent?error=pc_security_error", request.url));
      }

      return NextResponse.redirect(new URL(`/connexion/agent?error=${result.error}`, request.url));
    }

    // Récupérer l'URL de redirection sauvegardée (si existe)
    const redirectUrl = await getAndClearRedirectUrl();
    const finalRedirect = redirectUrl || DEFAULT_REDIRECTS.admin;

    return NextResponse.redirect(new URL(finalRedirect, request.url));
  } catch (err) {
    return NextResponse.redirect(new URL("/connexion/agent?error=pc_auth_failed", request.url));
  }
}
