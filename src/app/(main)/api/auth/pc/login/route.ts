import { generateAuthorizationUrl } from "@/features/auth/adapters/proconnect/proconnect.service";
import { getServerEnv } from "@/shared/config/env.config";
import { NextResponse } from "next/server";

/**
 * GET /api/auth/pc/login
 * Initie le flow de connexion ProConnect
 */
export async function GET() {
  try {
    const authUrl = await generateAuthorizationUrl();
    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error("Erreur lors de l'initiation ProConnect:", error);
    const baseUrl = getServerEnv().BASE_URL || "http://localhost:3000";
    return NextResponse.redirect(new URL("/connexion/agent?error=pc_init_failed", baseUrl));
  }
}
