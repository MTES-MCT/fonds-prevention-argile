import { getValidationDataByToken } from "@/lib/actions/parcours/amo/amo.actions";
import ValidationAmoForm from "./components/ValidationAmoForm";

interface ValidationAmoPageProps {
  params: {
    token: string;
  };
}

export default async function ValidationAmoPage({
  params,
}: ValidationAmoPageProps) {
  // Récupérer et vérifier le token côté serveur
  const result = await getValidationDataByToken(params.token);

  // Si le token est invalide, expiré ou déjà utilisé
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
                <li>Le lien a déjà été utilisé</li>
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

  // Si le token est valide, afficher le formulaire de validation
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
              Identité : <strong>{result.data.demandeur.codeInsee}</strong>
            </p>
            <p className="fr-mb-4w">
              Adresse : <strong>{result.data.demandeur.codeInsee}</strong>
            </p>

            <ValidationAmoForm
              validationId={result.data.validationId}
              token={params.token}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
