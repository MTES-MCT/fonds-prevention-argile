import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { userRepo } from "@/shared/database/repositories";
import { COOKIE_NAMES, getCookieOptions } from "@/features/auth/domain/value-objects";

interface ClaimDossierPageProps {
  params: Promise<{ token: string }>;
}

/**
 * Point d'entrée du lien envoyé par email à un demandeur pour lequel un
 * agent Aller-vers a pré-créé un dossier.
 *
 * Flux :
 * 1. Vérifie que le token existe, n'est pas expiré et n'a pas déjà été consommé.
 * 2. Si valide, pose un cookie httpOnly de courte durée (5 min) qui sera lu
 *    par le callback FranceConnect pour rattacher le user stub au compte FC.
 * 3. Redirige vers /api/auth/fc/login pour lancer le flux FranceConnect.
 */
export default async function ClaimDossierPage({ params }: ClaimDossierPageProps) {
  const { token } = await params;

  const stub = await userRepo.findByClaimToken(token);

  if (!stub) {
    return (
      <section className="fr-container fr-py-10w">
        <div className="fr-grid-row fr-grid-row--center">
          <div className="fr-col-12 fr-col-md-8">
            <div className="fr-alert fr-alert--error">
              <h3 className="fr-alert__title">Lien invalide ou expiré</h3>
              <p>Ce lien de finalisation d&apos;inscription n&apos;est plus valide.</p>
              <p className="fr-mt-2w">Les raisons possibles :</p>
              <ul>
                <li>Le lien a expiré (validité de 90 jours)</li>
                <li>Le lien a déjà été utilisé</li>
                <li>Le lien est incorrect</li>
              </ul>
              <p className="fr-mt-4w">
                Si vous pensez qu&apos;il s&apos;agit d&apos;une erreur, veuillez contacter l&apos;agent qui vous a transmis ce
                lien, ou écrivez-nous à{" "}
                <a href="mailto:contact@fonds-prevention-argile.beta.gouv.fr">
                  contact@fonds-prevention-argile.beta.gouv.fr
                </a>
                .
              </p>
              <p className="fr-mt-4w">
                <Link href="/" className="fr-btn">
                  Retour à l&apos;accueil
                </Link>
              </p>
            </div>
          </div>
        </div>
      </section>
    );
  }

  // Pose le cookie qui sera consommé par le callback FranceConnect.
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAMES.FC_CLAIM_TOKEN, token, getCookieOptions(300));

  redirect("/api/auth/fc/login");
}
