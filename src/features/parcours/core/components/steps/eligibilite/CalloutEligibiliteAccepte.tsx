"use client";

export default function CalloutEligibiliteAccepte() {
  return (
    <div className="fr-callout fr-callout--yellow-moutarde fr-icon-time-line">
      <p className="fr-callout__title">Logement éligible ! Faites réaliser le diagnostic et soumettez-le.</p>
      <p className="fr-callout__text">
        Votre dossier est bien éligible et votre diagnostic logement peut être effectué (vous recevrez votre aide après
        instruction). Vous pouvez désormais contacter votre AMO pour trouver le bureau d’étude pour la réalisation de ce
        diagnostic. Lorsque c’est fait, n’oubliez pas de transmettre vos résultats.
      </p>
      <p className="fr-text--sm fr-mt-2w fr-mb-0" style={{ fontStyle: "italic", color: "var(--text-mention-grey)" }}>
        Vous passerez automatiquement à l’étape diagnostic dans les prochaines heures, sans action de votre part.
      </p>
    </div>
  );
}
