import { NextResponse } from "next/server";
import { generateLogoutUrl, clearSessionCookies } from "@/lib/auth/server";
import { AUTH_METHODS } from "@/lib/auth/core/auth.constants";
import { getSession } from "@/lib/auth/services/auth.service";

export async function POST() {
  try {
    const session = await getSession();

    // Verifier si l'utilisateur est connecté via FranceConnect
    if (
      session?.authMethod === AUTH_METHODS.FRANCECONNECT &&
      session?.fcIdToken
    ) {
      const logoutUrl = generateLogoutUrl(session.fcIdToken);

      // Nettoyer la session locale
      await clearSessionCookies();

      // Rediriger vers FranceConnect
      return NextResponse.json({
        success: true,
        redirectUrl: logoutUrl,
      });
    }

    // Cas d'erreur : pas de token FC
    return NextResponse.json(
      { success: false, error: "Session FranceConnect invalide" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Erreur lors de la déconnexion FranceConnect:", error);
    return NextResponse.json(
      { success: false, error: "Erreur serveur" },
      { status: 500 }
    );
  }
}
