"use client";

import type { DepartementDisponible } from "@/features/backoffice/administration/statistiques/domain/types";

interface DepartementSelectorProps {
  departements: DepartementDisponible[];
  selectedCode: string | null;
  onChange: (code: string) => void;
  loading?: boolean;
}

export default function DepartementSelector({
  departements,
  selectedCode,
  onChange,
  loading,
}: DepartementSelectorProps) {
  return (
    <div className="fr-select-group fr-mb-4w" style={{ maxWidth: "500px" }}>
      <label className="fr-label" htmlFor="select-departement">
        Département
      </label>
      <select
        className="fr-select"
        id="select-departement"
        value={selectedCode ?? ""}
        onChange={(e) => onChange(e.target.value)}
        disabled={loading}
      >
        <option value="" disabled>
          Sélectionnez un département
        </option>
        {departements.map((dept) => (
          <option key={dept.code} value={dept.code}>
            {dept.code} — {dept.nom} ({dept.nombreParcours} parcours)
          </option>
        ))}
      </select>
    </div>
  );
}
