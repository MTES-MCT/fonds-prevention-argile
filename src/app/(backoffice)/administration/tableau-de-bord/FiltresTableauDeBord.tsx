"use client";

import { PERIODES } from "@/features/backoffice/administration/tableau-de-bord/domain/types/tableau-de-bord.types";
import type { PeriodeId } from "@/features/backoffice/administration/tableau-de-bord/domain/types/tableau-de-bord.types";
import type { DepartementDisponible } from "@/features/backoffice/administration/acquisition/domain/types";

interface FiltresTableauDeBordProps {
  periodeId: PeriodeId;
  codeDepartement: string;
  departements: DepartementDisponible[];
  onPeriodeChange: (periodeId: PeriodeId) => void;
  onDepartementChange: (codeDepartement: string) => void;
  departementDisabled?: boolean;
}

export function FiltresTableauDeBord({
  periodeId,
  codeDepartement,
  departements,
  onPeriodeChange,
  onDepartementChange,
  departementDisabled = false,
}: FiltresTableauDeBordProps) {
  return (
    <div className="fr-grid-row fr-grid-row--gutters fr-grid-row--right">
      <div className="fr-col-auto">
        <div className="fr-select-group">
          <select
            className="fr-select"
            id="filtre-periode"
            name="periode"
            value={periodeId}
            onChange={(e) => onPeriodeChange(e.target.value as PeriodeId)}
            aria-label="Période d'analyse">
            {PERIODES.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="fr-col-auto">
        <div className="fr-select-group">
          <select
            className="fr-select"
            id="filtre-departement"
            name="departement"
            value={codeDepartement}
            onChange={(e) => onDepartementChange(e.target.value)}
            disabled={departementDisabled}
            aria-label="Filtre par département">
            <option value="">Tous les départements</option>
            {departements.map((d) => (
              <option key={d.code} value={d.code}>
                {d.code.padStart(2, "0")} {d.nom}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
