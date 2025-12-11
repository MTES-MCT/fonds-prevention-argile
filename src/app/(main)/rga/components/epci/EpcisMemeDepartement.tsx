import Link from "next/link";

import type { EpciSEO, DepartementSEO } from "@/features/seo";

interface EpcisMemeDepartementProps {
  epcis: EpciSEO[];
  departement: DepartementSEO;
  currentEpciSiren: string;
}

export function EpcisMemeDepartement({ epcis, departement, currentEpciSiren }: EpcisMemeDepartementProps) {
  const autresEpcis = epcis.filter((e) => e.codeSiren !== currentEpciSiren);

  if (autresEpcis.length === 0) return null;

  return (
    <section className="fr-py-4w">
      <div className="fr-container">
        <h2>Le Retrait-Gonflement des Argiles dans les autres intercommunalités en {departement.nom}</h2>

        <ul className="fr-tags-group">
          {autresEpcis.map((epci) => (
            <li key={epci.codeSiren}>
              <Link href={`/rga/epci/${epci.slug}`} className="fr-tag">
                {epci.nom}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
