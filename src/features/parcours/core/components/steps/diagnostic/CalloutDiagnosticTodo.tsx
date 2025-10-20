import Link from "next/link";

export default function CalloutDiagnosticTodo() {
  return (
    <div className="fr-callout fr-callout--yellow-moutarde fr-icon-info-line">
      <p className="fr-callout__title">
        Logement éligible ! Faites réaliser le diagnostic et soumettez-le.
      </p>
      <p className="fr-callout__text">
        Votre dossier est bien éligible et votre diagnostic logement peut être
        effectué (vous recevrez votre aide après instruction). Vous pouvez
        désormais contacter votre AMO pour trouver le bureau d’étude pour la
        réalisation de ce diagnostic. Lorsque c’est fait, n’oubliez pas de
        transmettre vos résultats.
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
