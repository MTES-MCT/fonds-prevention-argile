import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  console.log("✅ Route /oidc-callback atteinte");
  console.log("Params:", request.nextUrl.searchParams.toString());

  try {
    // Construire l'URL de redirection
    const url = new URL("/api/auth/fc/callback", request.url);
    url.search = request.nextUrl.search;

    console.log("🔄 Tentative de redirection vers:", url.toString());

    // Utiliser NextResponse.redirect au lieu de Response.redirect
    const response = NextResponse.redirect(url);
    console.log("✅ Réponse de redirection créée");

    return response;
  } catch (error) {
    console.error("❌ Erreur dans /oidc-callback:", error);
    // Redirection de secours
    return NextResponse.redirect(
      new URL(`/connexion?error=fc_callback_error`, request.url)
    );
  }
}
