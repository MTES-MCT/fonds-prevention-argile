"use client";

import { useState } from "react";
import type { PartialRGASimulationData } from "@/shared/domain/types";
import { SimulateurLayout } from "../shared/SimulateurLayout";
import { NavigationButtons } from "../shared/NavigationButtons";

interface StepIndemnisationProps {
  initialValue?: {
    dejaIndemnise?: boolean;
    avantJuillet2025?: boolean;
    avantJuillet2015?: boolean;
    montant?: number;
  };
  numeroEtape: number;
  totalEtapes: number;
  canGoBack: boolean;
  onSubmit: (data: PartialRGASimulationData) => void;
  onBack: () => void;
}

/**
 * Étape 5 : Indemnisation RGA passée
 */
export function StepIndemnisation({
  initialValue,
  numeroEtape,
  totalEtapes,
  canGoBack,
  onSubmit,
  onBack,
}: StepIndemnisationProps) {
  const [dejaIndemnise, setDejaIndemnise] = useState<boolean | undefined>(initialValue?.dejaIndemnise);
  const [avantJuillet2025, setAvantJuillet2025] = useState<boolean | undefined>(initialValue?.avantJuillet2025);
  const [avantJuillet2015, setAvantJuillet2015] = useState<boolean | undefined>(initialValue?.avantJuillet2015);
  const [montant, setMontant] = useState<string>(initialValue?.montant?.toString() ?? "");

  // Reset des questions suivantes quand on change une réponse
  const handleDejaIndemniseChange = (value: boolean) => {
    setDejaIndemnise(value);
    if (!value) {
      setAvantJuillet2025(undefined);
      setAvantJuillet2015(undefined);
      setMontant("");
    }
  };

  const handleAvantJuillet2025Change = (value: boolean) => {
    setAvantJuillet2025(value);
    if (!value) {
      setAvantJuillet2015(undefined);
      setMontant("");
    }
  };

  const handleAvantJuillet2015Change = (value: boolean) => {
    setAvantJuillet2015(value);
    if (value) {
      setMontant("");
    }
  };

  // Validation du formulaire
  const isValid = (): boolean => {
    if (dejaIndemnise === undefined) return false;
    if (dejaIndemnise === false) return true;
    if (avantJuillet2025 === undefined) return false;
    if (avantJuillet2025 === false) return true;
    if (avantJuillet2015 === undefined) return false;
    if (avantJuillet2015 === true) return true;
    return montant !== "" && parseInt(montant, 10) >= 0;
  };

  const handleSubmit = () => {
    if (!isValid()) return;

    const montantValue =
      dejaIndemnise && avantJuillet2025 && avantJuillet2015 === false ? parseInt(montant, 10) : undefined;

    onSubmit({
      rga: {
        indemnise_indemnise_rga: dejaIndemnise,
        indemnise_avant_juillet_2025: dejaIndemnise ? avantJuillet2025 : undefined,
        indemnise_avant_juillet_2015: dejaIndemnise && avantJuillet2025 ? avantJuillet2015 : undefined,
        indemnise_montant_indemnite: montantValue,
      },
    });
  };

  return (
    <SimulateurLayout
      title="La maison a-t-elle déjà été indemnisée au titre du retrait-gonflement des argiles ?"
      currentStep={numeroEtape}
      totalSteps={totalEtapes}>
      {/* Question 1 : Déjà indemnisé ? */}
      <fieldset className="fr-fieldset md:w-1/2" id="indemnise-fieldset">
        <legend className="fr-fieldset__legend--regular fr-fieldset__legend fr-sr-only">Indemnisation passée</legend>

        <div className="fr-fieldset__element">
          <div className="fr-radio-group fr-radio-rich">
            <input
              type="radio"
              id="indemnise-oui"
              name="indemnisation"
              checked={dejaIndemnise === true}
              onChange={() => handleDejaIndemniseChange(true)}
            />
            <label className="fr-label" htmlFor="indemnise-oui">
              Oui
            </label>
          </div>
        </div>

        <div className="fr-fieldset__element">
          <div className="fr-radio-group fr-radio-rich">
            <input
              type="radio"
              id="indemnise-non"
              name="indemnisation"
              checked={dejaIndemnise === false}
              onChange={() => handleDejaIndemniseChange(false)}
            />
            <label className="fr-label" htmlFor="indemnise-non">
              Non
            </label>
          </div>
        </div>
      </fieldset>

      {/* Question 2 : Avant juillet 2025 ? */}
      {dejaIndemnise && (
        <fieldset className="fr-fieldset fr-mt-4w" id="avant-2025-fieldset">
          <h4>Avez-vous reçu cette indemnité au titre du retrait-gonflement des argiles avant le 1er juillet 2025 ?</h4>

          <div className="md:w-1/2">
            <div className="fr-fieldset__element ">
              <div className="fr-radio-group fr-radio-rich">
                <input
                  type="radio"
                  id="avant-2025-oui"
                  name="avant-2025"
                  checked={avantJuillet2025 === true}
                  onChange={() => handleAvantJuillet2025Change(true)}
                />
                <label className="fr-label" htmlFor="avant-2025-oui">
                  Oui
                </label>
              </div>
            </div>

            <div className="fr-fieldset__element">
              <div className="fr-radio-group fr-radio-rich">
                <input
                  type="radio"
                  id="avant-2025-non"
                  name="avant-2025"
                  checked={avantJuillet2025 === false}
                  onChange={() => handleAvantJuillet2025Change(false)}
                />
                <label className="fr-label" htmlFor="avant-2025-non">
                  Non
                </label>
              </div>
            </div>
          </div>
        </fieldset>
      )}

      {/* Question 3 : Avant juillet 2015 ? */}
      {dejaIndemnise && avantJuillet2025 && (
        <fieldset className="fr-fieldset fr-mt-4w" id="avant-2015-fieldset">
          <h4>La date de cette indemnité précède-elle le 1er juillet 2015 ?</h4>

          <div className="md:w-1/2">
            <div className="fr-fieldset__element">
              <div className="fr-radio-group fr-radio-rich">
                <input
                  type="radio"
                  id="avant-2015-oui"
                  name="avant-2015"
                  checked={avantJuillet2015 === true}
                  onChange={() => handleAvantJuillet2015Change(true)}
                />
                <label className="fr-label" htmlFor="avant-2015-oui">
                  Oui
                </label>
              </div>
            </div>

            <div className="fr-fieldset__element">
              <div className="fr-radio-group fr-radio-rich">
                <input
                  type="radio"
                  id="avant-2015-non"
                  name="avant-2015"
                  checked={avantJuillet2015 === false}
                  onChange={() => handleAvantJuillet2015Change(false)}
                />
                <label className="fr-label" htmlFor="avant-2015-non">
                  Non
                </label>
              </div>
            </div>
          </div>
        </fieldset>
      )}

      {/* Question 4 : Montant */}
      {dejaIndemnise && avantJuillet2025 && avantJuillet2015 === false && (
        <div className="fr-input-group fr-mt-4w">
          <h4>Quel est le montant TTC de l'indemnisation reçue au titre du retrait-gonflement des argiles ?</h4>
          <div className="md:w-1/2">
            <div className="fr-input-wrap fr-input-wrap--addon">
              <input
                className="fr-input md:w-1/2"
                type="number"
                id="montant-indemnisation"
                min="0"
                value={montant}
                onChange={(e) => setMontant(e.target.value)}
              />
              <span className="fr-addon fr-ml-2w">€</span>
            </div>
          </div>
        </div>
      )}

      <NavigationButtons onPrevious={onBack} onNext={handleSubmit} canGoBack={canGoBack} isNextDisabled={!isValid()} />
    </SimulateurLayout>
  );
}
