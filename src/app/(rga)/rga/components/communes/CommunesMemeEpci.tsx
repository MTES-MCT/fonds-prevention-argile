import Link from "next/link";

import type { CommuneSEO, EpciSEO } from "@/features/seo";

interface CommunesMemeEpciProps {
  communes: CommuneSEO[];
  epci: EpciSEO;
  currentCommuneInsee: string;
}

export function CommunesMemeEpci({ communes, epci, currentCommuneInsee }: CommunesMemeEpciProps) {
  const autresCommunes = communes.filter((c) => c.codeInsee !== currentCommuneInsee);

  if (autresCommunes.length === 0) return null;

  return (
    <section className="fr-py-4w">
      <div className="fr-container">
        <h2>Le Retrait-Gonflement des Argiles dans les autres communes de {epci.nom}</h2>

        <ul className="fr-tags-group">
          {autresCommunes.map((commune) => (
            <li key={commune.codeInsee}>
              <Link href={`/rga/commune/${commune.slug}`} className="fr-tag">
                Retrait-Gonflement des Argiles à {commune.nom} ({commune.codesPostaux.join(", ")})
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
