import { NextResponse } from "next/server";
import { generateLogoutUrl, logout, AUTH_METHODS } from "@/lib/auth/server";

export async function POST() {
  try {
    // Récupérer les infos de session avant de nettoyer
    const { authMethod, fcIdToken } = await logout();

    // Si c'est un utilisateur FranceConnect, préparer la déconnexion FC
    if (authMethod === AUTH_METHODS.FRANCECONNECT && fcIdToken) {
      const logoutUrl = generateLogoutUrl(fcIdToken);

      // Rediriger vers FranceConnect pour déconnexion complète
      return NextResponse.json({
        success: true,
        redirectUrl: logoutUrl,
      });
    }

    // Sinon déconnexion simple (déjà faite par le premier logout())
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erreur lors de la déconnexion:", error);
    return NextResponse.json(
      { success: false, error: "Erreur serveur" },
      { status: 500 }
    );
  }
}
