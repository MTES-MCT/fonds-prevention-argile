"use client";

export default function CalloutEligibiliteRefuse() {
  return (
    <div className="fr-callout fr-callout--pink-tuile fr-icon-time-line">
      <p className="fr-callout__title">
        Logement non éligible. Contactez votre instructeur pour en savoir plus.
      </p>
      <p className="fr-callout__text">
        Nous sommes désolés, mais votre dossier a été refusé. Pour plus
        d'informations, veuillez contacter votre instructeur.
      </p>
    </div>
  );
}
