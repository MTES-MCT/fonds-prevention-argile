import { NextResponse } from "next/server";
import { generateAuthorizationUrl } from "@/lib/auth/server";
import { getServerEnv } from "@/lib/config/env.config";

/**
 * GET /api/auth/fc/login
 * Initie le flow de connexion FranceConnect
 */
export async function GET() {
  try {
    // Générer l'URL d'autorisation avec state et nonce
    const authUrl = await generateAuthorizationUrl();

    // Rediriger vers FranceConnect
    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error("Erreur lors de l'initiation FranceConnect:", error);

    // Récupérer la base URL depuis l'environnement
    const baseUrl = getServerEnv().BASE_URL || "http://localhost:3000";

    // En cas d'erreur, rediriger vers la page de connexion avec un message
    return NextResponse.redirect(
      new URL("/connexion?error=fc_init_failed", baseUrl)
    );
  }
}
