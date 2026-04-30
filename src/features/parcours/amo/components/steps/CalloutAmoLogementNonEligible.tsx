"use client";

/**
 * Callout affiché quand le logement du demandeur a été déclaré non éligible par un AMO
 * (statutAmo = LOGEMENT_NON_ELIGIBLE) ou pour les anciens records ACCOMPAGNEMENT_REFUSE
 * (rétrocompatibilité, cf. fusion dans MonCompteClient).
 */
export default function CalloutAmoLogementNonEligible() {
  return (
    <div id="choix-amo">
      <div className="fr-callout fr-icon-info-line fr-callout--pink-tuile">
        <p className="fr-callout__title">Vous n&apos;êtes pas éligible</p>
        <p className="fr-callout__text fr-mb-4w">
          Malheureusement, après analyse de votre dossier par un AMO, il semble que votre logement ne réponde pas aux
          critères d&apos;éligibilité du fonds de prévention argile.
        </p>

        <p className="fr-text--bold fr-mb-2w">Que faire maintenant ?</p>
        <ul className="fr-mb-0">
          <li>
            Rapprochez-vous de votre assureur pour vérifier vos garanties sécheresse/RGA et les démarches à suivre.
          </li>
          <li>Demandez à votre mairie si votre commune a fait l&apos;objet d&apos;une reconnaissance de catastrophe naturelle.</li>
        </ul>
      </div>
    </div>
  );
}
