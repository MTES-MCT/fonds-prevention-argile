"use client";

interface CalloutAmoLogementNonEligibleProps {
  /**
   * `amo` : la décision vient de l'analyse d'un AMO (statut de validation refusé).
   * `dossier` : elle vient des informations du dossier — qualification d'un Aller-vers
   * ou simulation du demandeur, qui n'ont pas été « analysées par un AMO ».
   */
  origine?: "amo" | "dossier";
}

/**
 * Callout affiché quand le logement du demandeur est déclaré non éligible.
 */
export default function CalloutAmoLogementNonEligible({ origine = "amo" }: CalloutAmoLogementNonEligibleProps = {}) {
  return (
    <div id="choix-amo">
      <div className="fr-callout fr-icon-info-line fr-callout--pink-tuile">
        <p className="fr-callout__title">Vous n&apos;êtes pas éligible</p>
        <p className="fr-callout__text fr-mb-4w">
          {origine === "amo"
            ? "Malheureusement, après analyse de votre dossier par un AMO, il semble que votre logement ne réponde pas aux critères d'éligibilité du fonds de prévention argile."
            : "Malheureusement, au vu des informations de votre dossier, votre logement ne répond pas aux critères d'éligibilité du fonds de prévention argile."}
        </p>

        <p className="fr-text--bold fr-mb-2w">Que faire maintenant ?</p>
        <ul className="fr-mb-0">
          <li>
            Rapprochez-vous de votre assureur pour vérifier vos garanties sécheresse/RGA et les démarches à suivre.
          </li>
          <li>
            Demandez à votre mairie si votre commune a fait l&apos;objet d&apos;une reconnaissance de catastrophe
            naturelle.
          </li>
        </ul>
      </div>
    </div>
  );
}
