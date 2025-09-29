"use client";

export default function CalloutEligibiliteEnInstruction() {
  return (
    <div className="fr-callout fr-callout--blue-cumulus fr-icon-time-line">
      <p className="fr-callout__title">Votre dossier est en instruction</p>
      <p className="fr-callout__text">
        Un instructeur examine votre formulaire d’éligibilité. Vous serez
        informé ici et par e-mail dès que la décision sera prise.
      </p>
      <ul className="fr-btns-group fr-btns-group--inline">
        <li>
          <button type="button" className="fr-btn fr-btn--secondary">
            libellé du bouton 2
          </button>
        </li>
        <li>
          <button type="button" className="fr-btn fr-btn--secondary">
            libellé du bouton 3
          </button>
        </li>
      </ul>
    </div>
  );
}
