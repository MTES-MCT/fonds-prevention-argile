"use client";

import { NavigationButtons } from "@/features/simulateur/components/shared/NavigationButtons";
import { useCreationDossierStore } from "../../stores/creation-dossier.store";

export function StepIdentite() {
  const demandeur = useCreationDossierStore((s) => s.demandeur);
  const update = useCreationDossierStore((s) => s.updateDemandeur);
  const next = useCreationDossierStore((s) => s.next);
  const previous = useCreationDossierStore((s) => s.previous);

  const canGoNext = demandeur.nom.trim().length > 0 && demandeur.prenom.trim().length > 0;

  return (
    <>
      <h4 className="fr-mb-1v">Comment s&apos;appelle le demandeur ?</h4>
      <p className="fr-text--sm fr-mb-4w text-gray-500">
        Ces informations seront mises à jour si nécessaire lorsque le demandeur se connectera avec France Connect
      </p>

      <div className="fr-input-group">
        <label className="fr-label" htmlFor="demandeur-prenom">
          Prénom
        </label>
        <input
          className="fr-input"
          type="text"
          id="demandeur-prenom"
          name="demandeur-prenom"
          value={demandeur.prenom}
          onChange={(e) => update({ prenom: e.target.value })}
        />
      </div>

      <div className="fr-input-group">
        <label className="fr-label" htmlFor="demandeur-nom">
          Nom
        </label>
        <input
          className="fr-input"
          type="text"
          id="demandeur-nom"
          name="demandeur-nom"
          value={demandeur.nom}
          onChange={(e) => update({ nom: e.target.value })}
        />
      </div>

      <NavigationButtons canGoBack onPrevious={previous} onNext={next} isNextDisabled={!canGoNext} />
    </>
  );
}
