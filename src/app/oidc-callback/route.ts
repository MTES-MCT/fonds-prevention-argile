import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  console.log("✅ Route /oidc-callback atteinte");
  console.log("Params:", request.nextUrl.searchParams.toString());

  // Rediriger vers votre vraie route de callback
  const url = new URL("/api/auth/fc/callback", request.url);
  url.search = request.nextUrl.search; // Copier tous les paramètres

  return Response.redirect(url);
}
