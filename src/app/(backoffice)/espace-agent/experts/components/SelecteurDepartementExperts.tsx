"use client";

import { useRouter } from "next/navigation";
import { VUE_TERRITOIRE, VUE_TOUS } from "@/features/backoffice";

interface Departement {
  code: string;
  nom: string;
  aDesExperts: boolean;
}

interface SelecteurDepartementExpertsProps {
  // Code d'un département, ou l'une des vues groupées.
  valeurActuelle: string;
  departementsConsultables: readonly Departement[];
  departementsDuTerritoire: readonly string[];
  libelleTous: string;
  territoireRegroupable: boolean;
}

function Options({ departements }: { departements: readonly Departement[] }) {
  return departements.map((d) => (
    <option key={d.code} value={d.code}>
      {d.code} - {d.nom}
      {d.aDesExperts ? "" : " (aucun expert)"}
    </option>
  ));
}

/** Change de vue dès la sélection ; elle reste dans l'URL pour les liens de l'encart. */
export function SelecteurDepartementExperts({
  valeurActuelle,
  departementsConsultables,
  departementsDuTerritoire,
  libelleTous,
  territoireRegroupable,
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
        defaultValue={valeurActuelle}
        onChange={(e) =>
          router.replace(`/espace-agent/experts?departement=${encodeURIComponent(e.target.value)}`, { scroll: false })
        }>
        {departementsConsultables.length > 1 && <option value={VUE_TOUS}>{libelleTous}</option>}
        {territoireRegroupable && (
          <option value={VUE_TERRITOIRE}>Votre territoire ({departementsDuTerritoire.length} départements)</option>
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
