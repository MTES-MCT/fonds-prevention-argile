"use client";

export function AmoAccueilPanel() {
  return (
    <section className="fr-container-fluid fr-py-8w bg-(--background-alt-blue-france)">
      <div className="fr-container">
        <h2>X demandes d’accompagnement à traiter</h2>

        {/* TODO: Table des dossiers suivis */}
        <div className="fr-callout fr-my-4w">
          <h3 className="fr-callout__title">En cours de développement</h3>
          <p className="fr-callout__text">Cette fonctionnalité est en cours de développement.</p>
        </div>
      </div>
    </section>
  );
}
