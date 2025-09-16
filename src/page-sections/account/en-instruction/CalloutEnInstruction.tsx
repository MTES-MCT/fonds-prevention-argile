import Link from "next/link";

export default function CalloutEnInstruction() {
  return (
    <div className="fr-callout fr-callout--blue-ecume fr-icon-info-line">
      <p className="fr-callout__title">Votre dossier est en instruction</p>
      <p className="fr-callout__text">
        Un instructeur examine votre formulaire d’éligibilité. Vous serez
        informé ici et par e-mail dès que la décision sera prise. Votre dossier
        a été déposé le 15/09/25. Selon nos délais moyens constatés, vous
        devriez recevoir un avis d’ici le 20/09/2025.
      </p>
      <ul className="fr-btns-group fr-btns-group--inline fr-btns-group--icon-right">
        <li>
          <Link
            type="button"
            href="#"
            rel="noopener noreferrer"
            target="_blank"
            className="fr-btn fr-btn--tertiary fr-btn--icon-right fr-icon-external-link"
          >
            Voir mes réponses au formulaire
          </Link>
        </li>
        <li>
          <Link
            type="button"
            href="#"
            rel="noopener noreferrer"
            target="_blank"
            className="fr-btn fr-btn--tertiary fr-btn--icon-right fr-icon-arrow-right-s-line"
          >
            Aller sur ma messagerie
          </Link>
        </li>
      </ul>
    </div>
  );
}
