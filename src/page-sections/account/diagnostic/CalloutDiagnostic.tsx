import Link from "next/link";

export default function CalloutDiagnostic() {
  return (
    <div className="fr-callout fr-callout--yellow-moutarde fr-icon-info-line">
      <p className="fr-callout__title">A FAIRE</p>
      <p className="fr-callout__text">
        Votre dossier est bien éligible et votre diagnostic logement peut être
        effectué (il vous sera remboursé par la suite). Vous pouvez désormais
        contacter un bureau d’étude proche de chez vous pour la réalisation de
        ce diagnostic. Vous trouverez des contacts ci-dessous. Lorsque c’est
        fait, n’oubliez pas de transmettre votre résultat.
      </p>
      <Link
        href="#"
        rel="noopener noreferrer"
        target="_blank"
        className="fr-btn fr-btn--icon-right fr-icon-arrow-right-s-line"
      >
        Transmettre le résultat de mon diagnostic
      </Link>
    </div>
  );
}
