import type { BuildingData } from "@/shared/services/bdnb";
import { getRgaRiskLevel } from "@/shared/services/bdnb";
import { ALEA_COLORS } from "../domain/config";

interface RgaBuildingInfoProps {
  building: BuildingData;
  className?: string;
}

export function RgaBuildingInfo({ building, className = "" }: RgaBuildingInfoProps) {
  const riskLevel = getRgaRiskLevel(building.aleaArgiles);

  const riskConfig = {
    fort: { label: "Fort", color: ALEA_COLORS.fort, textColor: "#fff" },
    moyen: { label: "Moyen", color: ALEA_COLORS.moyen, textColor: "#000" },
    faible: { label: "Faible", color: ALEA_COLORS.faible, textColor: "#000" },
    nul: { label: "Aucun", color: "#e0e0e0", textColor: "#000" },
  } as const;

  const risk = riskConfig[riskLevel];

  return (
    <div className={`fr-p-2w fr-background-default--grey ${className}`}>
      <p className="fr-text--sm fr-text--bold fr-mb-1w">Bâtiment sélectionné</p>

      <div className="fr-mb-2w">
        <span
          className="fr-badge fr-text--sm"
          style={{
            backgroundColor: risk.color,
            color: risk.textColor,
          }}>
          Aléa {risk.label}
        </span>
      </div>

      <dl className="fr-text--sm">
        {building.adresse && (
          <>
            <dt className="fr-text--bold">Adresse</dt>
            <dd className="fr-mb-1w">
              {building.adresse}
              {building.codePostal && `, ${building.codePostal}`}
              {building.commune && ` ${building.commune}`}
            </dd>
          </>
        )}

        {building.anneeConstruction && (
          <>
            <dt className="fr-text--bold">Année de construction</dt>
            <dd className="fr-mb-1w">{building.anneeConstruction}</dd>
          </>
        )}

        {building.surfaceHabitable && (
          <>
            <dt className="fr-text--bold">Surface habitable</dt>
            <dd className="fr-mb-1w">{building.surfaceHabitable} m²</dd>
          </>
        )}

        {building.nombreNiveaux && (
          <>
            <dt className="fr-text--bold">Nombre de niveaux</dt>
            <dd className="fr-mb-1w">{building.nombreNiveaux}</dd>
          </>
        )}

        {building.etiquetteEnergie && (
          <>
            <dt className="fr-text--bold">DPE Énergie</dt>
            <dd className="fr-mb-1w">{building.etiquetteEnergie}</dd>
          </>
        )}
      </dl>
    </div>
  );
}
