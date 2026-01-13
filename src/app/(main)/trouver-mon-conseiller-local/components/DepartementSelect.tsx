import { getAllDepartementsEligibles } from "@/shared/constants/rga.constants";
import { getDepartementNom } from "@/shared/utils";

interface DepartementSelectProps {
  value: string;
  onChange: (value: string) => void;
  availableDepartements: string[];
  label: string;
  placeholder: string;
}

export function DepartementSelect({
  value,
  onChange,
  availableDepartements,
  label,
  placeholder,
}: DepartementSelectProps) {
  // Filtrer et trier les départements éligibles qui ont des conseillers
  const departements = getAllDepartementsEligibles()
    .filter((dept) => availableDepartements.includes(dept.code))
    .sort((a, b) => a.code.localeCompare(b.code));

  return (
    <div className="fr-select-group">
      <label className="fr-label" htmlFor="departement-select">
        <strong>{label}</strong>
      </label>
      <select
        className="fr-select"
        id="departement-select"
        name="departement"
        value={value}
        onChange={(e) => onChange(e.target.value)}>
        <option value="">{placeholder}</option>
        {departements.map((dept) => (
          <option key={dept.code} value={dept.code}>
            {dept.code} - {getDepartementNom(dept.code)}
          </option>
        ))}
      </select>
    </div>
  );
}
