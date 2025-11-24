"use client";

import { UserWithParcoursDetails } from "@/features/parcours/core";
import { getDepartementName } from "@/shared/constants/departements.constants";
import {
  countUsersByDepartement,
  extractUniqueDepartements,
  AUCUN_DEPARTEMENT,
  countUsersWithoutDepartement,
} from "./departementFilter.utils";

interface DepartementFilterProps {
  users: UserWithParcoursDetails[];
  selectedDepartement: string;
  onDepartementChange: (departement: string) => void;
}

export function DepartementFilter({ users, selectedDepartement, onDepartementChange }: DepartementFilterProps) {
  const departementsUniques = extractUniqueDepartements(users);

  if (departementsUniques.length === 0) {
    return null;
  }

  return (
    <div className="fr-grid-row">
      <div className="fr-col-12 fr-col-md-6 fr-col-lg-4">
        <div className="fr-select-group fr-mb-4w">
          <label className="fr-label" htmlFor="select-departement">
            Filtrer par département
          </label>
          <select
            className="fr-select"
            id="select-departement"
            name="select-departement"
            value={selectedDepartement}
            onChange={(e) => onDepartementChange(e.target.value)}>
            <option value="">Tous les départements ({users.length} utilisateurs)</option>
            {countUsersWithoutDepartement(users) > 0 && (
              <option value={AUCUN_DEPARTEMENT}>
                Aucun département ({countUsersWithoutDepartement(users)} utilisateur
                {countUsersWithoutDepartement(users) > 1 ? "s" : ""})
              </option>
            )}
            {departementsUniques.map((dept) => {
              const count = countUsersByDepartement(users, dept);
              return (
                <option key={dept} value={dept}>
                  {dept} - {getDepartementName(dept)} ({count} utilisateur{count > 1 ? "s" : ""})
                </option>
              );
            })}
          </select>
        </div>
      </div>
    </div>
  );
}
