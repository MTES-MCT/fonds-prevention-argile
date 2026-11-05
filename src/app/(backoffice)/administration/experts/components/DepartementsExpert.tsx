import type { DepartementExpert } from "@/features/backoffice";

/** Départements d'un expert, chacun avec son contact de réservation. */
export default function DepartementsExpert({ departements }: { departements: DepartementExpert[] }) {
  return (
    <ul className="text-sm list-none p-0 m-0 flex flex-col gap-1">
      {departements.map((departement) => (
        <li key={departement.code}>
          <span className="font-medium">
            {departement.nom} ({departement.code})
          </span>
          {departement.email || departement.telephone ? (
            <span className="block text-(--text-mention-grey)">
              {[departement.email, departement.telephone].filter(Boolean).join(" · ")}
            </span>
          ) : (
            <span className="block text-(--text-mention-grey)">Contact non renseigné</span>
          )}
        </li>
      ))}
    </ul>
  );
}
