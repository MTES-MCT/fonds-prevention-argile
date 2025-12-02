import type { EpciSEO } from "@/features/seo";

interface EpcisTagsProps {
  epcis: EpciSEO[];
  title: string;
}

export function EpciTags({ epcis, title }: EpcisTagsProps) {
  if (epcis.length === 0) return null;

  return (
    <section className="fr-py-4w">
      <div className="fr-container">
        <h2>{title}</h2>

        <ul className="fr-tags-group">
          {epcis.map((epci) => (
            <li key={epci.codeSiren}>
              <a href={`/rga/epci/${epci.slug}`} className="fr-tag">
                Risques Retrait-Gonflement des Argiles {epci.nom}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
