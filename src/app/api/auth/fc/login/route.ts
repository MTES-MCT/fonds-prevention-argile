import { NextResponse } from "next/server";
import { generateAuthorizationUrl } from "@/lib/auth/franceconnect";

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

    // En cas d'erreur, rediriger vers la page de connexion avec un message
    return NextResponse.redirect(
      new URL(
        "/connexion?error=fc_init_failed",
        process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"
      )
    );
  }
}
