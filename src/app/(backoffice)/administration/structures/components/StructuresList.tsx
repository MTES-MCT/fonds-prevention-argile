import Link from "next/link";
import type { StructureListee } from "@/features/backoffice";
import BadgesHabilitations from "./BadgesHabilitations";

export default function StructuresList({ structures }: { structures: StructureListee[] }) {
  if (structures.length === 0) {
    return (
      <div className="fr-callout">
        <p className="fr-callout__text">Aucune structure pour ces critères.</p>
      </div>
    );
  }

  return (
    <div className="fr-table fr-table--no-caption fr-table--multiline">
      <div className="fr-table__wrapper">
        <div className="fr-table__container">
          <div className="fr-table__content">
            <table>
              <caption>Structures</caption>
              <thead>
                <tr>
                  <th scope="col">Structure</th>
                  <th scope="col">Habilitations</th>
                  <th scope="col">Départements</th>
                  <th scope="col">Agents actifs</th>
                </tr>
              </thead>
              <tbody>
                {structures.map((structure) => (
                  <tr key={structure.id}>
                    <td>
                      <Link href={`/administration/structures/${structure.id}`} className="fr-link font-medium">
                        {structure.nom}
                      </Link>
                      <span className="block text-sm text-(--text-mention-grey)">
                        {structure.siret ? `SIRET ${structure.siret}` : "SIRET non renseigné"}
                      </span>
                    </td>
                    <td>
                      <BadgesHabilitations
                        habilitations={structure.habilitations}
                        expertDesactive={structure.expertDesactive}
                      />
                    </td>
                    <td className="text-sm">
                      {structure.departements.length > 0 ? (
                        structure.departements.join(", ")
                      ) : (
                        <span className="text-(--text-mention-grey)">Aucun</span>
                      )}
                    </td>
                    <td>{structure.agentsActifs}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
