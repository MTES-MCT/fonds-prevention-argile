import { getServerEnv } from "@/shared/config/env.config";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const env = getServerEnv();
    const baseUrl = env.BASE_URL;

    // Construire l'URL avec la bonne base
    const url = new URL("/api/auth/fc/callback", baseUrl);
    url.search = request.nextUrl.search;

    return NextResponse.redirect(url);
  } catch (error) {
    console.error("Erreur dans /oidc-callback:", error);
    const baseUrl = getServerEnv().BASE_URL;
    return NextResponse.redirect(
      new URL("/connexion?error=fc_callback_error", baseUrl)
    );
  }
}
