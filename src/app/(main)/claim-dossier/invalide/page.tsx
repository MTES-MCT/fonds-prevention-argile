import Link from "next/link";

/**
 * Page d'erreur affichée lorsqu'un lien de claim (`/claim-dossier/[token]`)
 * est invalide, expiré ou déjà consommé. La redirection ici est faite par
 * le route handler `/claim-dossier/[token]/route.ts` (Next 15 interdit de
 * poser un cookie depuis un Server Component, d'où le découpage).
 */
export default function ClaimDossierInvalidePage() {
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
