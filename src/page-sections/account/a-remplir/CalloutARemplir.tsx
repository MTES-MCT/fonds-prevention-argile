import Link from "next/link";

export default function CalloutARemplir() {
  return (
    <div className="fr-callout fr-callout--yellow-moutarde fr-icon-info-line">
      <p className="fr-callout__title">A FAIRE</p>
      <p className="fr-callout__text">
        Il est essentiel de compléter et de soumettre le premier formulaire pour
        que votre dossier soit examiné par les autorités compétentes. Par la
        suite, vous recevrez une notification concernant les étapes à suivre.
      </p>
      <Link
        href="#"
        rel="noopener noreferrer"
        target="_blank"
        className="fr-btn fr-btn--icon-right fr-icon-arrow-right-s-line"
      >
        Remplir le formulaire d'éligibilité
      </Link>
    </div>
  );
}
