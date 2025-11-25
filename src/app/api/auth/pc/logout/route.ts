import { AUTH_METHODS, clearSessionCookies, getSession } from "@/features/auth";
import { generateLogoutUrl } from "@/features/auth/adapters/proconnect/proconnect.service";
import { NextResponse } from "next/server";

export async function POST() {
  try {
    const session = await getSession();

    if (session?.authMethod === AUTH_METHODS.PROCONNECT && session?.fcIdToken) {
      const logoutUrl = generateLogoutUrl(session.fcIdToken);
      await clearSessionCookies();

      return NextResponse.json({
        success: true,
        redirectUrl: logoutUrl,
      });
    }

    return NextResponse.json({ success: false, error: "Session ProConnect invalide" }, { status: 400 });
  } catch (error) {
    console.error("Erreur lors de la déconnexion ProConnect:", error);
    return NextResponse.json({ success: false, error: "Erreur serveur" }, { status: 500 });
  }
}
