import { redirect } from "next/navigation";
import Link from "next/link";
import { getValidationDataByToken } from "@/features/parcours/amo/actions";
import { StatutValidationAmo } from "@/features/parcours/amo/domain/value-objects";
import { ROUTES } from "@/features/auth/domain/value-objects/configs/routes.config";

interface ValidationAmoPageProps {
  params: Promise<{
    token: string;
  }>;
}

/**
 * Page de validation AMO (lien envoyé par email)
 *
 * Cette page redirige vers la page de détail de demande dans l'espace AMO.
 * Si le token est invalide ou expiré, affiche un message d'erreur.
 * Si le token a déjà été utilisé, affiche un résumé et un lien vers l'espace AMO.
 */
export default async function ValidationAmoPage({ params }: ValidationAmoPageProps) {
  const { token } = await params;

  // Récupérer et vérifier le token côté serveur
  const result = await getValidationDataByToken(token);

  // Si le token est invalide ou expiré, afficher un message d'erreur
  if (!result.success) {
    return (
      <section className="fr-container fr-py-10w">
        <div className="fr-grid-row fr-grid-row--center">
          <div className="fr-col-12 fr-col-md-8">
            <div className="fr-alert fr-alert--error">
              <h3 className="fr-alert__title">Lien invalide</h3>
              <p>{result.error}</p>
              <p className="fr-mt-2w">Ce lien de validation n&apos;est plus valide. Les raisons possibles :</p>
              <ul>
                <li>Le lien a expiré (validité de 90 jours)</li>
                <li>Le lien est incorrect</li>
              </ul>
              <p className="fr-mt-4w">
                Si vous pensez qu&apos;il s&apos;agit d&apos;une erreur, veuillez contacter le demandeur pour
                qu&apos;il vous envoie un nouveau lien.
              </p>
            </div>
          </div>
        </div>
      </section>
    );
  }

  // Si le token a déjà été utilisé, afficher un résumé et proposer d'aller sur l'espace AMO
  if (result.data.isUsed) {
    let choixMessage = "";

    switch (result.data.statut) {
      case StatutValidationAmo.LOGEMENT_ELIGIBLE:
        choixMessage = "Vous avez confirmé l'accompagnement et attesté de l'éligibilité du demandeur.";
        break;
      case StatutValidationAmo.LOGEMENT_NON_ELIGIBLE:
        choixMessage = "Vous avez indiqué que le demandeur n'est pas éligible.";
        break;
      case StatutValidationAmo.ACCOMPAGNEMENT_REFUSE:
        choixMessage = "Vous avez refusé d'accompagner ce demandeur.";
        break;
      default:
        choixMessage = "Vous avez déjà répondu à cette demande.";
    }

    return (
      <section className="fr-container fr-py-10w">
        <div className="fr-grid-row fr-grid-row--center">
          <div className="fr-col-12 fr-col-md-8">
            <div className="fr-alert fr-alert--info">
              <h3 className="fr-alert__title">Validation déjà effectuée</h3>
              <p>
                Vous avez déjà répondu à cette demande le{" "}
                <strong>
                  {result.data.usedAt
                    ? new Date(result.data.usedAt).toLocaleDateString("fr-FR", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "date inconnue"}
                </strong>{" "}
                et le demandeur a été notifié.
              </p>
              <p className="fr-mt-2w">
                <strong>Votre choix :</strong> {choixMessage}
              </p>
            </div>

            <div className="fr-mt-4w">
              <Link href={ROUTES.backoffice.espaceAmo.demande(result.data.validationId)} className="fr-btn">
                Voir le détail de la demande
              </Link>
            </div>

            <p className="fr-mt-4w fr-text--sm">
              Si vous constatez un problème, n&apos;hésitez pas à nous contacter à{" "}
              <a href="mailto:contact@fonds-prevention-argile.beta.gouv.fr">
                contact@fonds-prevention-argile.beta.gouv.fr
              </a>
              .
            </p>
          </div>
        </div>
      </section>
    );
  }

  // Si le token est valide et pas encore utilisé, rediriger vers la page de détail
  // L'authentification sera gérée par le layout de l'espace AMO
  redirect(ROUTES.backoffice.espaceAmo.demande(result.data.validationId));
}
