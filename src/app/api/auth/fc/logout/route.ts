import { NextResponse } from "next/server";
import {
  getCurrentUser,
  generateLogoutUrl,
  logout,
  AUTH_METHODS,
} from "@/lib/auth/server";

export async function POST() {
  try {
    const user = await getCurrentUser();

    // Si c'est un utilisateur FranceConnect, faire la déconnexion FC
    if (user?.authMethod === AUTH_METHODS.FRANCECONNECT && user.fcIdToken) {
      const logoutUrl = generateLogoutUrl(user.fcIdToken);

      // Nettoyer la session locale
      await logout();

      // Rediriger vers FranceConnect pour déconnexion complète
      return NextResponse.json({
        success: true,
        redirectUrl: logoutUrl,
      });
    }

    // Sinon déconnexion simple
    await logout();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erreur lors de la déconnexion:", error);
    return NextResponse.json(
      { success: false, error: "Erreur serveur" },
      { status: 500 }
    );
  }
}
