import { NextResponse } from "next/server";
import { logout } from "@/lib/auth/simpleAuth";
import { generateLogoutUrl } from "@/lib/auth/franceconnect";

/**
 * POST /api/auth/fc/logout
 * Déconnecte l'utilisateur de l'application ET de FranceConnect
 */
export async function POST() {
  try {
    const sessionInfo = await logout();

    // Si FranceConnect, déconnecter aussi de FC
    if (sessionInfo.authMethod === "franceconnect" && sessionInfo.fcIdToken) {
      // URL de déconnexion FranceConnect
      const logoutUrl = generateLogoutUrl(sessionInfo.fcIdToken);

      // Rediriger vers FranceConnect pour déconnexion
      return NextResponse.redirect(logoutUrl);
    }

    // Si pas FranceConnect, redirection simple vers l'accueil
    return NextResponse.redirect(
      new URL("/", process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000")
    );
  } catch (error) {
    console.error("Erreur lors de la déconnexion:", error);

    // En cas d'erreur, au moins déconnecter localement et rediriger
    await logout().catch(() => {}); // Ignorer les erreurs

    return NextResponse.redirect(
      new URL("/", process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000")
    );
  }
}

/**
 * GET /api/auth/fc/logout
 * Alternative en GET (certains boutons de déconnexion utilisent des liens)
 */
export async function GET() {
  return POST();
}
