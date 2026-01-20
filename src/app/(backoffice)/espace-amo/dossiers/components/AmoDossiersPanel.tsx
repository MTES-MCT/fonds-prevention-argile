"use client";

/**
 * Panel des dossiers suivis pour l'espace AMO
 *
 * TODO: Implémenter avec la table des dossiers en cours d'accompagnement
 */
export function AmoDossiersPanel() {
  return (
    <div>
      <h2>Dossiers en cours d&apos;accompagnement</h2>
      <p className="fr-text--sm fr-text--mention-grey">
        Les dossiers que vous accompagnez actuellement apparaîtront ici.
      </p>

      {/* TODO: Table des dossiers suivis */}
      <div className="fr-callout fr-my-4w">
        <h3 className="fr-callout__title">En cours de développement</h3>
        <p className="fr-callout__text">
          Cette fonctionnalité est en cours de développement. Vous pourrez bientôt suivre l&apos;avancement des dossiers
          que vous accompagnez.
        </p>
      </div>
    </div>
  );
}
