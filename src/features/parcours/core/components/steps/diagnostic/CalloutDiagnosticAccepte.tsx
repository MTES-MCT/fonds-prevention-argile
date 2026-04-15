"use client";

export default function CalloutDiagnosticAccepte() {
  return (
    <div className="fr-callout fr-callout--green-emeraude fr-icon-checkbox-circle-line">
      <p className="fr-callout__title">Diagnostic validé !</p>
      <p className="fr-callout__text">
        Votre diagnostic a été accepté. Vous allez pouvoir passer à l'étape suivante : la soumission de vos devis.
        Rechargez la page dans quelques instants pour accéder à cette nouvelle étape.
      </p>
    </div>
  );
}
