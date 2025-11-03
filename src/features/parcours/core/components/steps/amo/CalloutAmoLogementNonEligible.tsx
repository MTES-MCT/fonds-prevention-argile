"use client";

export default function CalloutAmoLogementNonEligible() {
  return (
    <div id="choix-amo">
      <div className="fr-callout fr-icon-info-line fr-callout--pink-tuile">
        <p className="fr-callout__title">Vous n’êtes pas éligible</p>
        <p className="fr-callout__text fr-mb-4w">
          Malheureusement, après analyse de votre dossier par un AMO, il semble
          que votre logement ne réponde pas aux critères d’éligibilité du fonds
          de prévention argile.
        </p>
        <h6>Que faire maintenant ?</h6>
        <ul>
          <li>
            Rapprochez‑vous de votre assureur pour vérifier vos garanties
            sécheresse/RGA et les démarches à suivre.
          </li>
          <li>
            Si vous constatez des fissures ou des dégâts, déclarez un sinistre
            et conservez photos, devis et factures.
          </li>
          <li>
            Demandez à votre mairie si votre commune a fait l’objet d’une
            reconnaissance de catastrophe naturelle.
          </li>
        </ul>
      </div>
    </div>
  );
}
