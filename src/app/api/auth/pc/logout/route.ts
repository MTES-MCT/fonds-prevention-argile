import { AUTH_METHODS, clearSessionCookies, lireSessionSignee } from "@/features/auth";
import { generateLogoutUrl } from "@/features/auth/adapters/proconnect/proconnect.service";
import { NextResponse } from "next/server";

export async function POST() {
  try {
    // Session lue même non conforme : une session antérieure à la 2FA doit pouvoir se fermer chez ProConnect.
    const session = await lireSessionSignee();

    if (session?.authMethod === AUTH_METHODS.PROCONNECT && session?.idToken) {
      const logoutUrl = generateLogoutUrl(session.idToken);
      await clearSessionCookies();

      return NextResponse.json({
        success: true,
        redirectUrl: logoutUrl,
      });
    }

    await clearSessionCookies();
    return NextResponse.json({ success: false, error: "Session ProConnect invalide" }, { status: 400 });
  } catch (error) {
    console.error("Erreur lors de la déconnexion ProConnect:", error);
    return NextResponse.json({ success: false, error: "Erreur serveur" }, { status: 500 });
  }
}
