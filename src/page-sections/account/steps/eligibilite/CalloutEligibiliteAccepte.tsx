"use client";

export default function CalloutEligibiliteAccepte() {
  return (
    <div className="fr-callout fr-callout--blue-cumulus fr-icon-time-line">
      <p className="fr-callout__title">DOSSIER ACCEPTE</p>
      <p className="fr-callout__text">
        Votre dossier est bien éligible et votre diagnostic logement peut être
        effectué (il vous sera remboursé par la suite). Vous pouvez désormais
        contacter un bureau d’étude proche de chez vous pour la réalisation de
        ce diagnostic. Vous trouverez des contacts ci-dessous. Lorsque c’est
        fait, n’oubliez pas de transmettre votre résultat.
      </p>
      <button
        onClick={() => {}}
        className="fr-btn fr-btn--icon-right fr-icon-arrow-right-s-line"
      >
        Transmettre le résultat de mon diagnostic
      </button>
    </div>
  );
}
