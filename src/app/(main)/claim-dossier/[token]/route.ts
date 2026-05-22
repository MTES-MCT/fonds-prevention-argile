import { NextResponse, type NextRequest } from "next/server";
import { userRepo } from "@/shared/database/repositories";
import { COOKIE_NAMES, getCookieOptions } from "@/features/auth/domain/value-objects";
import { getServerEnv } from "@/shared/config/env.config";

/**
 * Point d'entrée du lien envoyé par email à un demandeur pour lequel un agent
 * AMO ou Aller-vers a pré-créé un dossier.
 *
 * Implémenté comme Route Handler (et non Page) parce que Next.js 15 interdit
 * de modifier les cookies depuis un Server Component. La pose du cookie
 * `FC_CLAIM_TOKEN` est nécessaire ici pour qu'il soit lu par le callback
 * FranceConnect (`consumeClaimToken`) lors du rattachement du user stub.
 *
 * Flux :
 * 1. Vérifie que le token existe, n'est pas expiré et n'a pas déjà été consommé.
 * 2. Si valide, pose un cookie httpOnly (15 min) puis redirige vers la page
 *    `/connexion` pour que le demandeur lance FranceConnect lui-même — c'est
 *    plus rassurant qu'un redirect direct vers le bouton FC. Le cookie est
 *    consommé par `consumeClaimToken` dans le callback FC.
 * 3. Sinon, redirige vers `/claim-dossier/invalide` qui affiche le message d'erreur.
 */
const CLAIM_COOKIE_TTL_SECONDS = 15 * 60;

export async function GET(_request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const stub = await userRepo.findByClaimToken(token);

  const baseUrl = getServerEnv().BASE_URL;

  if (!stub) {
    return NextResponse.redirect(new URL("/claim-dossier/invalide", baseUrl));
  }

  const response = NextResponse.redirect(new URL("/connexion", baseUrl));
  response.cookies.set(COOKIE_NAMES.FC_CLAIM_TOKEN, token, getCookieOptions(CLAIM_COOKIE_TTL_SECONDS));
  return response;
}
