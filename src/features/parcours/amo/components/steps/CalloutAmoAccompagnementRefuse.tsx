"use client";

/**
 * Callout affiché quand l'AMO a jugé le demandeur éligible mais a renoncé à l'accompagner
 * (ADR-0022). À ne pas confondre avec `CalloutAmoLogementNonEligible` : ici l'éligibilité
 * n'est pas en cause, seul l'accompagnement manque.
 */
export default function CalloutAmoAccompagnementRefuse() {
  return (
    <div id="choix-amo">
      <div className="fr-callout fr-icon-info-line fr-callout--yellow-moutarde">
        <p className="fr-callout__title">Votre dossier est en pause</p>
        <p className="fr-callout__text fr-mb-4w">
          Votre logement remplit les critères du fonds de prévention argile. En revanche, la structure
          d&apos;accompagnement sollicitée n&apos;a pas pu prendre en charge votre dossier : vos démarches sont donc
          suspendues pour le moment.
        </p>

        <p className="fr-text--bold fr-mb-2w">Que faire maintenant ?</p>
        <ul className="fr-mb-0">
          <li>
            Si vous souhaitez reprendre vos démarches, écrivez-nous à{" "}
            <a href="mailto:contact@fonds-prevention-argile.beta.gouv.fr">
              contact@fonds-prevention-argile.beta.gouv.fr
            </a>{" "}
            en précisant votre nom et votre commune.
          </li>
          <li>Un conseiller de votre territoire pourra alors réactiver votre dossier et vous indiquer la suite.</li>
        </ul>
      </div>
    </div>
  );
}
