import { redirect } from "next/navigation";
import { checkAmoAccess, checkProConnectAccess, ROUTES } from "@/features/auth";
import { AccesNonAutoriseAmo, AccesNonAutoriseAgentNonEnregistre } from "@/shared/components";
import { getCurrentAgent } from "@/features/backoffice";
import { getValidationDataByToken } from "@/features/parcours/amo/actions";
import { StatutValidationAmo } from "@/features/parcours/amo/domain/value-objects";
import ValidationAmoForm from "./components/ValidationAmoForm";

interface ValidationAmoPageProps {
  params: Promise<{
    token: string;
  }>;
}

/**
 * Espace AMO - Page de validation d'une demande
 *
 * Accessible uniquement aux AMO connectés via ProConnect
 * Le token est utilisé pour identifier la demande à valider
 */
export default async function ValidationAmoPage({ params }: ValidationAmoPageProps) {
  const { token } = await params;

  // Vérifier que l'utilisateur est connecté via ProConnect
  const proConnectCheck = await checkProConnectAccess();

  // Si pas connecté du tout → redirect vers connexion agent avec retour vers cette page
  if (!proConnectCheck.hasAccess && proConnectCheck.errorCode === "NOT_AUTHENTICATED") {
    // Encode l'URL de retour pour revenir ici après connexion
    const returnUrl = encodeURIComponent(`/espace-amo/validation/${token}`);
    redirect(`${ROUTES.connexion.agent}?returnTo=${returnUrl}`);
  }

  // Si pas ProConnect (ex: FranceConnect) : bloquer
  if (!proConnectCheck.hasAccess) {
    return <AccesNonAutoriseAmo />;
  }

  // Vérifier que l'agent est enregistré en BDD
  const agentResult = await getCurrentAgent();
  if (!agentResult.success) {
    return <AccesNonAutoriseAgentNonEnregistre />;
  }

  // Vérifier que l'utilisateur est AMO
  const amoCheck = await checkAmoAccess();
  if (!amoCheck.hasAccess) {
    return <AccesNonAutoriseAmo />;
  }

  // Récupérer et vérifier le token côté serveur
  const result = await getValidationDataByToken(token);

  // Si le token est invalide ou expiré
  if (!result.success) {
    return (
      <div className="fr-grid-row fr-grid-row--center">
        <div className="fr-col-12 fr-col-md-8">
          <div className="fr-alert fr-alert--error">
            <h3 className="fr-alert__title">Lien invalide</h3>
            <p>{result.error}</p>
            <p className="fr-mt-2w">Ce lien de validation n&apos;est plus valide. Les raisons possibles :</p>
            <ul>
              <li>Le lien a expiré (validité de 7 jours)</li>
              <li>Le lien est incorrect</li>
            </ul>
            <p className="fr-mt-4w">
              Si vous pensez qu&apos;il s&apos;agit d&apos;une erreur, veuillez contacter le demandeur pour qu&apos;il
              vous envoie un nouveau lien.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Si le token a déjà été utilisé
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
            <p className="fr-mt-2w">
              Si vous constatez un problème, n&apos;hésitez pas à nous contacter à{" "}
              <a href="mailto:contact@fonds-prevention-argile.beta.gouv.fr">
                contact@fonds-prevention-argile.beta.gouv.fr
              </a>
              .
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Si le token est valide et pas encore utilisé, afficher le formulaire
  return (
    <div className="fr-grid-row fr-grid-row--center">
      <div className="fr-col-12">
        <div className="fr-alert fr-alert--info fr-mb-4w">
          <h3 className="fr-alert__title">Nouvelle demande d&apos;accompagnement</h3>
          <p>
            Ce demandeur sollicite votre confirmation en tant qu&apos;AMO certifié pour son dossier d&apos;aide au Fonds
            de Prévention Argile. Cette étape est essentielle pour qu&apos;il puisse avancer dans le processus.
          </p>
        </div>

        <div className="fr-background-alt--blue-cumulus fr-p-4w fr-mb-4w">
          <h3>
            <span className="fr-icon-account-circle-line fr-mr-1w"></span>
            Informations du demandeur
          </h3>

          <div className="fr-mb-4w">
            <p className="fr-mb-1v">
              <span className="fr-text--regular">Identité : </span>
              <strong>
                {result.data.demandeur.prenom} {result.data.demandeur.nom}
              </strong>
            </p>

            <p className="fr-mb-1v">
              <span className="fr-text--regular">Adresse : </span>
              <strong>{result.data.demandeur.adresseLogement}</strong>
            </p>

            {result.data.demandeur.email && (
              <p className="fr-mb-1v">
                <span className="fr-text--regular">Email : </span>
                <strong>{result.data.demandeur.email}</strong>
              </p>
            )}

            {result.data.demandeur.telephone && (
              <p className="fr-mb-0">
                <span className="fr-text--regular">Téléphone : </span>
                <strong>{result.data.demandeur.telephone}</strong>
              </p>
            )}
          </div>

          <ValidationAmoForm validationId={result.data.validationId} token={token} />
        </div>
      </div>
    </div>
  );
}
