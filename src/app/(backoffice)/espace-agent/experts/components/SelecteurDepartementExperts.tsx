"use client";

import { useRouter } from "next/navigation";

interface Departement {
  code: string;
  nom: string;
}

interface SelecteurDepartementExpertsProps {
  departementActuel: string | null;
  departementsConsultables: readonly Departement[];
  departementsDuTerritoire: readonly string[];
}

function Options({ departements }: { departements: readonly Departement[] }) {
  return departements.map((d) => (
    <option key={d.code} value={d.code}>
      {d.code} - {d.nom}
    </option>
  ));
}

/** Change de département dès la sélection ; le département reste dans l'URL pour les liens de l'encart. */
export function SelecteurDepartementExperts({
  departementActuel,
  departementsConsultables,
  departementsDuTerritoire,
}: SelecteurDepartementExpertsProps) {
  const router = useRouter();
  const territoire = departementsConsultables.filter((d) => departementsDuTerritoire.includes(d.code));
  const autres = departementsConsultables.filter((d) => !departementsDuTerritoire.includes(d.code));
  // Des groupes n'ont de sens que si l'agent peut sortir de son territoire.
  const avecGroupes = territoire.length > 0 && autres.length > 0;

  return (
    <div className="fr-select-group fr-mb-0 md:min-w-80">
      <label className="fr-label" htmlFor="departement-experts">
        Département
      </label>
      <select
        className="fr-select"
        id="departement-experts"
        defaultValue={departementActuel ?? ""}
        onChange={(e) =>
          router.replace(`/espace-agent/experts?departement=${encodeURIComponent(e.target.value)}`, { scroll: false })
        }>
        {!departementActuel && (
          <option value="" disabled>
            Sélectionner un département
          </option>
        )}
        {avecGroupes ? (
          <>
            <optgroup label="Votre territoire">
              <Options departements={territoire} />
            </optgroup>
            <optgroup label="Autres départements">
              <Options departements={autres} />
            </optgroup>
          </>
        ) : (
          <Options departements={departementsConsultables} />
        )}
      </select>
    </div>
  );
}
