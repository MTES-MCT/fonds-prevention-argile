"use client";

import { NavigationButtons } from "@/features/simulateur/components/shared/NavigationButtons";
import { useCreationDossierStore } from "../../stores/creation-dossier.store";

export function StepChoixMode() {
  const wantsSimulation = useCreationDossierStore((s) => s.wantsSimulation);
  const setWantsSimulation = useCreationDossierStore((s) => s.setWantsSimulation);
  const next = useCreationDossierStore((s) => s.next);

  const handleChange = (value: boolean) => setWantsSimulation(value);

  return (
    <>
      <h4 className="fr-mb-4w">Que souhaitez-vous faire ?</h4>

      <div className="fr-form-group">
        <fieldset className="fr-fieldset">
          <div className="fr-fieldset__content">
            <div className="fr-radio-group">
              <input
                type="radio"
                id="choix-mode-avec"
                name="choix-mode"
                checked={wantsSimulation === true}
                onChange={() => handleChange(true)}
              />
              <label className="fr-label" htmlFor="choix-mode-avec">
                Faire une simulation d&apos;éligibilité puis créer le dossier
              </label>
            </div>
            <div className="fr-radio-group">
              <input
                type="radio"
                id="choix-mode-sans"
                name="choix-mode"
                checked={wantsSimulation === false}
                onChange={() => handleChange(false)}
              />
              <label className="fr-label" htmlFor="choix-mode-sans">
                Créer simplement un dossier sans faire de simulation d&apos;éligibilité
              </label>
            </div>
          </div>
        </fieldset>
      </div>

      <NavigationButtons canGoBack={false} onNext={next} isNextDisabled={wantsSimulation === null} />
    </>
  );
}
