"use client";

import { useEffect, useRef, useState } from "react";
import type { PartialRGASimulationData, RGASimulationData } from "@/shared/domain/types/rga-simulation.types";
import { SimulationRecap } from "@/features/simulateur/components/shared/SimulationRecap";
import type { ComparaisonSimulations } from "@/features/simulateur/domain/services/comparaison-simulations.service";

type Choix = "active" | "candidate";

interface ChoixSimulationModalProps {
  isOpen: boolean;
  /** Simulation déjà rattachée au compte. */
  active: RGASimulationData | null;
  /** Simulation faite avant de se connecter. */
  candidate: PartialRGASimulationData | null;
  comparaison: ComparaisonSimulations;
  isSaving?: boolean;
  onConfirmer: (choix: Choix) => void;
  /** Fermeture sans choix : la version active est conservée. */
  onFermer: () => void;
}

/**
 * Arbitrage entre la simulation du compte et celle faite avant connexion.
 *
 * Le défaut est la version active : fermer la fenêtre ne doit jamais faire perdre
 * au demandeur le dossier qu'il avait déjà, et c'est le seul choix qui n'écrit rien.
 */
export function ChoixSimulationModal({
  isOpen,
  active,
  candidate,
  comparaison,
  isSaving,
  onConfirmer,
  onFermer,
}: ChoixSimulationModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [choix, setChoix] = useState<Choix>("candidate");

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const modalInstance = (window as any).dsfr?.(dialog)?.modal;
    if (!modalInstance) return;

    if (isOpen) modalInstance.disclose();
    else modalInstance.conceal();
  }, [isOpen]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleConceal = () => onFermer();
    dialog.addEventListener("dsfr.conceal", handleConceal);
    return () => dialog.removeEventListener("dsfr.conceal", handleConceal);
  }, [onFermer]);

  return (
    <dialog
      ref={dialogRef}
      id="modal-choix-simulation"
      className="fr-modal"
      aria-labelledby="modal-choix-simulation-title">
      <div className="fr-container fr-container--fluid fr-container-md">
        <div className="fr-grid-row fr-grid-row--center">
          <div className="fr-col-12 fr-col-lg-10">
            <div className="fr-modal__body">
              <div className="fr-modal__header">
                <button
                  aria-controls="modal-choix-simulation"
                  title="Fermer"
                  type="button"
                  className="fr-btn--close fr-btn">
                  Fermer
                </button>
              </div>

              <div className="fr-modal__content">
                <h1 id="modal-choix-simulation-title" className="fr-modal__title">
                  <span className="fr-icon-arrow-right-line fr-icon--lg fr-mr-2v" aria-hidden="true"></span>
                  Confirmez la version de votre simulation à conserver
                </h1>

                <div
                  className={`fr-alert fr-alert--sm fr-mb-3w ${
                    comparaison.verdictsDivergent ? "fr-alert--warning" : "fr-alert--info"
                  }`}>
                  <p>
                    Vous avez deux simulations enregistrées avec des informations différentes.
                    {comparaison.verdictsDivergent &&
                      " Certaines de ces différences modifient votre éligibilité au dispositif."}
                  </p>
                </div>

                <h2 className="fr-h6 fr-mb-1v">Choisissez la version à conserver :</h2>
                <p className="fr-text--sm fr-text-mention--grey fr-mb-3w">
                  La version non conservée sera supprimée. Si vous fermez cette fenêtre sans choisir, la version active
                  sera conservée.
                </p>

                <div className="fr-grid-row fr-grid-row--gutters">
                  <div className="fr-col-12 fr-col-md-6">
                    <ChoixCarte
                      nom="choix-simulation"
                      valeur="active"
                      choisi={choix === "active"}
                      onChoisir={setChoix}
                      libelle="Conserver la version active">
                      <SimulationRecap
                        simulation={active}
                        titre="Version active"
                        estVersionActive
                        selectionne={choix === "active"}
                      />
                    </ChoixCarte>
                  </div>
                  <div className="fr-col-12 fr-col-md-6">
                    <ChoixCarte
                      nom="choix-simulation"
                      valeur="candidate"
                      choisi={choix === "candidate"}
                      onChoisir={setChoix}
                      libelle="Conserver la dernière version">
                      <SimulationRecap
                        simulation={candidate}
                        titre="Dernière version"
                        highlights={comparaison.signalements}
                        selectionne={choix === "candidate"}
                      />
                    </ChoixCarte>
                  </div>
                </div>
              </div>

              <div className="fr-modal__footer">
                <ul className="fr-btns-group fr-btns-group--right fr-btns-group--inline-reverse fr-btns-group--inline-lg">
                  <li>
                    <button type="button" className="fr-btn" onClick={() => onConfirmer(choix)} disabled={isSaving}>
                      {isSaving ? "Enregistrement..." : "Confirmer mon choix"}
                    </button>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </dialog>
  );
}

/**
 * Rend le récapitulatif cliquable dans son ensemble, avec un vrai bouton radio
 * pour le clavier et les lecteurs d'écran (la bordure seule ne dit rien).
 */
function ChoixCarte({
  nom,
  valeur,
  choisi,
  onChoisir,
  libelle,
  children,
}: {
  nom: string;
  valeur: Choix;
  choisi: boolean;
  onChoisir: (choix: Choix) => void;
  libelle: string;
  children: React.ReactNode;
}) {
  return (
    <label style={{ display: "block", cursor: "pointer" }}>
      <input
        type="radio"
        name={nom}
        value={valeur}
        checked={choisi}
        onChange={() => onChoisir(valeur)}
        className="fr-sr-only"
      />
      <span className="fr-sr-only">{libelle}</span>
      {children}
    </label>
  );
}
