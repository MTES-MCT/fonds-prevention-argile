"use client";

/**
 * Panel des demandes en attente pour l'espace AMO
 *
 * TODO: Implémenter avec la table des demandes en attente de validation
 */
export function AmoDemandesPanel() {
  return (
    <div>
      <h2>Demandes en attente de validation</h2>
      <p className="fr-text--sm fr-text--mention-grey">
        Les demandes de validation envoyées par les particuliers apparaîtront ici.
      </p>

      {/* TODO: Table des demandes en attente */}
      <div className="fr-callout fr-my-4w">
        <h3 className="fr-callout__title">En cours de développement</h3>
        <p className="fr-callout__text">
          Cette fonctionnalité est en cours de développement. Vous pourrez bientôt voir et traiter les demandes de
          validation directement depuis cet espace.
        </p>
      </div>
    </div>
  );
}
