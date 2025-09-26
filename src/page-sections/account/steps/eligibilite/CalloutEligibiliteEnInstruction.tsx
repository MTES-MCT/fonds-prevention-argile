"use client";

export default function CalloutEligibiliteEnInstruction() {
  return (
    <div className="fr-callout fr-callout--blue-cumulus fr-icon-time-line">
      <p className="fr-callout__title">EN COURS D'INSTRUCTION</p>
      <p className="fr-callout__text">
        Votre dossier est actuellement en cours d'examen par nos équipes. Vous
        recevrez une notification dès qu'une décision sera prise.
      </p>
      <p className="fr-text--sm fr-mt-2w">
        Délai moyen de traitement : 5 à 10 jours ouvrés
      </p>
    </div>
  );
}
