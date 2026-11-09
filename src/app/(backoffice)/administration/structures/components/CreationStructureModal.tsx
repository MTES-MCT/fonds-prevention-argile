"use client";

import { useEffect, useState } from "react";
import { LIBELLES_HABILITATION, TYPES_HABILITATION, type TypeHabilitation } from "@/features/backoffice";
import ModaleStructure from "./ModaleStructure";
import { fermerModale } from "./fermer-modale";
import ChampsAllersVers, {
  allersVersDepuis,
  allersVersRempli,
  versSaisieAllersVers,
  type SaisieAllersVers,
} from "./formulaires/ChampsAllersVers";
import ChampsAmo, { amoDepuis, amoRemplie, versSaisieAmo, type SaisieAmo } from "./formulaires/ChampsAmo";
import ChampsExpert, {
  expertDepuis,
  expertRempli,
  versSaisieExpert,
  type ExpertFormulaire,
} from "./formulaires/ChampsExpert";
import ChampsIdentite, { identiteDepuis, identiteRemplie, type IdentiteFormulaire } from "./formulaires/ChampsIdentite";

/** Forme attendue par `creerStructureAction` : l'identité et la première habilitation, qui fixe le type. */
export type DemandeCreation =
  | { identite: IdentiteFormulaire; habilitation: "amo"; saisie: SaisieAmo }
  | { identite: IdentiteFormulaire; habilitation: "allersVers"; saisie: SaisieAllersVers }
  | { identite: IdentiteFormulaire; habilitation: "expert"; saisie: ExpertFormulaire };

interface CreationStructureModalProps {
  modalId: string;
  // L'habilitation expert est réservée au super-administrateur.
  expertPossible: boolean;
  // Change à chaque ouverture, pour repartir d'un formulaire vide.
  versionOuverture: number;
  onConfirm: (demande: DemandeCreation) => Promise<boolean>;
  erreur?: string | null;
  isLoading?: boolean;
}

export default function CreationStructureModal({
  modalId,
  expertPossible,
  versionOuverture,
  onConfirm,
  erreur = null,
  isLoading = false,
}: CreationStructureModalProps) {
  const [identite, setIdentite] = useState(() => identiteDepuis(null));
  const [habilitation, setHabilitation] = useState<TypeHabilitation | null>(null);
  const [amo, setAmo] = useState(() => amoDepuis(null));
  const [allersVers, setAllersVers] = useState(() => allersVersDepuis(null));
  const [expert, setExpert] = useState(() => expertDepuis(null));

  useEffect(() => {
    setIdentite(identiteDepuis(null));
    setHabilitation(null);
    setAmo(amoDepuis(null));
    setAllersVers(allersVersDepuis(null));
    setExpert(expertDepuis(null));
  }, [versionOuverture]);

  const choix = TYPES_HABILITATION.filter((type) => type !== "expert" || expertPossible);
  const siretRequis = habilitation === "amo" || habilitation === "expert";
  const habilitationRemplie =
    (habilitation === "amo" && amoRemplie(amo)) ||
    (habilitation === "allersVers" && allersVersRempli(allersVers)) ||
    (habilitation === "expert" && expertRempli(expert));

  const demande = (): DemandeCreation | null => {
    if (habilitation === "amo") return { identite, habilitation, saisie: versSaisieAmo(amo) };
    if (habilitation === "allersVers") return { identite, habilitation, saisie: versSaisieAllersVers(allersVers) };
    if (habilitation === "expert") return { identite, habilitation, saisie: versSaisieExpert(expert) };
    return null;
  };

  const handleConfirm = async () => {
    const complete = demande();
    if (complete && (await onConfirm(complete))) fermerModale(modalId);
  };

  return (
    <ModaleStructure
      modalId={modalId}
      titre="Créer une structure"
      erreur={erreur}
      libelleConfirmation="Créer la structure"
      libelleEnCours="Création..."
      confirmationPossible={identiteRemplie(identite, siretRequis) && habilitationRemplie}
      onConfirm={handleConfirm}
      isLoading={isLoading}
      large>
      <ChampsIdentite
        idPrefix={modalId}
        valeur={identite}
        onChange={setIdentite}
        siretRequis={siretRequis}
        isLoading={isLoading}
      />

      <fieldset className="fr-fieldset fr-mt-2w">
        <legend className="fr-fieldset__legend">
          Première habilitation
          <span className="fr-hint-text">
            Elle fixe le type de la structure : accompagnement (AMO, Aller-vers) ou expert, qui ne se cumule pas avec
            les deux autres.
          </span>
        </legend>
        {choix.map((type) => (
          <div key={type} className="fr-fieldset__element fr-fieldset__element--inline">
            <div className="fr-radio-group">
              <input
                type="radio"
                id={`${modalId}-premiere-${type}`}
                name={`${modalId}-premiere-habilitation`}
                checked={habilitation === type}
                onChange={() => setHabilitation(type)}
                disabled={isLoading}
              />
              <label className="fr-label" htmlFor={`${modalId}-premiere-${type}`}>
                {LIBELLES_HABILITATION[type]}
              </label>
            </div>
          </div>
        ))}
      </fieldset>

      {habilitation && <h2 className="fr-h6 fr-mt-2w">Habilitation {LIBELLES_HABILITATION[habilitation]}</h2>}
      {habilitation === "amo" && (
        <ChampsAmo idPrefix={`${modalId}-amo`} valeur={amo} onChange={setAmo} isLoading={isLoading} />
      )}
      {habilitation === "allersVers" && (
        <ChampsAllersVers
          idPrefix={`${modalId}-allers-vers`}
          valeur={allersVers}
          onChange={setAllersVers}
          isLoading={isLoading}
        />
      )}
      {habilitation === "expert" && (
        <ChampsExpert idPrefix={`${modalId}-expert`} valeur={expert} onChange={setExpert} isLoading={isLoading} />
      )}
    </ModaleStructure>
  );
}
