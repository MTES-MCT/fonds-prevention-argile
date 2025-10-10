import { getValidationDataByToken } from "@/lib/actions/parcours/amo/amo.actions";
import ValidationAmoForm from "./components/ValidationAmoForm";
import { StatutValidationAmo } from "@/lib/parcours/amo/amo.types";

interface ValidationAmoPageProps {
  params: Promise<{
    token: string;
  }>;
}

export default async function ValidationAmoPage({
  params,
}: ValidationAmoPageProps) {
  // Await params pour Next.js 15
  const { token } = await params;

  // Récupérer et vérifier le token côté serveur
  const result = await getValidationDataByToken(token);

  // Si le token est invalide ou expiré
  if (!result.success) {
    return (
      <section className="fr-container fr-py-10w">
        <div className="fr-grid-row fr-grid-row--center">
          <div className="fr-col-12 fr-col-md-8">
            <div className="fr-alert fr-alert--error">
              <h3 className="fr-alert__title">Lien invalide</h3>
              <p>{result.error}</p>
              <p className="fr-mt-2w">
                Ce lien de validation n'est plus valide. Les raisons possibles :
              </p>
              <ul>
                <li>Le lien a expiré (validité de 7 jours)</li>
                <li>Le lien est incorrect</li>
              </ul>
              <p className="fr-mt-4w">
                Si vous pensez qu'il s'agit d'une erreur, veuillez contacter le
                demandeur pour qu'il vous envoie un nouveau lien.
              </p>
            </div>
          </div>
        </div>
      </section>
    );
  }

  // Si le token a déjà été utilisé
  if (result.data.isUsed) {
    let choixMessage = "";

    switch (result.data.statut) {
      case StatutValidationAmo.LOGEMENT_ELIGIBLE:
        choixMessage =
          "Vous avez confirmé l'accompagnement et attesté de l'éligibilité du demandeur.";
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
                et le demandeur a été notifié. .
              </p>
              <p className="fr-mt-2w">
                <strong>Votre choix :</strong> {choixMessage}
              </p>
              <p className="fr-mt-2w">
                Si vous constatez un problème, n'hésitez pas à nous contacter à{" "}
                <a href="mailto:contact@fonds-prevention-argile.beta.gouv.fr">
                  contact@fonds-prevention-argile.beta.gouv.fr
                </a>
                .
              </p>
            </div>
          </div>
        </div>
      </section>
    );
  }

  // Si le token est valide et pas encore utilisé, afficher le formulaire
  return (
    <section className="fr-container fr-py-10w">
      <div className="fr-grid-row fr-grid-row--center">
        <div className="fr-col-12 fr-col-md-10">
          <h1 className="fr-mb-2w">{result.data.entrepriseAmo.nom}</h1>

          <div className="fr-alert fr-alert--info fr-mb-4w">
            <h3 className="fr-alert__title">
              Nouvelle demande d'accompagnement
            </h3>
            <p>
              Ce demandeur sollicite votre confirmation en tant qu'AMO certifié
              pour son dossier d'aide au Fonds de Prévention Argile. Cette étape
              est essentielle pour qu'il puisse avancer dans le processus.
            </p>
          </div>

          <div className="container fr-background-alt--blue-cumulus fr-p-4w">
            <h3>
              <span className="fr-icon-account-circle-line fr-mr-1w"></span>
              Informations du demandeur
            </h3>
            <p className="fr-mb-1w">
              Identité :{" "}
              <strong>
                {result.data.demandeur.prenom} {result.data.demandeur.nom}
              </strong>
            </p>
            <p className="fr-mb-4w">
              Adresse :{" "}
              <strong> {result.data.demandeur.adresseLogement}</strong>
            </p>

            <ValidationAmoForm
              validationId={result.data.validationId}
              token={token}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
