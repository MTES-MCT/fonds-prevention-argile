import { ROUTES } from "@/features/auth";
import { generateAuthorizationUrl } from "@/features/auth/adapters/proconnect/proconnect.service";
import { getServerEnv } from "@/shared/config/env.config";
import { NextResponse } from "next/server";
import { limiterDebit } from "@/shared/services/limitation-debit/limitation-debit";

/**
 * GET /api/auth/pc/login
 * Initie le flow de connexion ProConnect
 */
export async function GET(request: Request) {
  const refus = limiterDebit(request, "connexion");
  if (refus) return refus;

  try {
    const authUrl = await generateAuthorizationUrl();
    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error("Erreur lors de l'initiation ProConnect:", error);
    const baseUrl = getServerEnv().BASE_URL || "http://localhost:3000";
    return NextResponse.redirect(new URL(`${ROUTES.connexion.agent}?error=pc_init_failed`, baseUrl));
  }
}
