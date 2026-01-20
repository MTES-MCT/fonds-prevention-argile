"use client";

/**
 * Panel des statistiques pour l'espace AMO
 *
 * TODO: Implémenter avec les statistiques d'activité de l'AMO
 */
export function AmoStatistiquesPanel() {
  return (
    <section className="fr-container-fluid fr-py-8w bg-(--background-alt-blue-france)">
      <div className="fr-container">
        <h2>Statistiques de votre activité</h2>
        <p className="fr-text--sm fr-text--mention-grey">
          Visualisez les statistiques de votre accompagnement des particuliers.
        </p>

        {/* TODO: Statistiques AMO */}
        <div className="fr-callout fr-my-4w">
          <h3 className="fr-callout__title">En cours de développement</h3>
          <p className="fr-callout__text">
            Cette fonctionnalité est en cours de développement. Vous pourrez bientôt consulter des statistiques sur
            votre activité : nombre de demandes traitées, délais moyens, etc.
          </p>
        </div>
      </div>
    </section>
  );
}
