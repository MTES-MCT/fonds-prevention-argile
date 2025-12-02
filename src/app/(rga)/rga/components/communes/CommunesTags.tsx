import type { CommuneSEO } from "@/features/seo";

interface CommunesTagsProps {
  communes: CommuneSEO[];
  title: string;
  currentCommuneInsee?: string;
}

export function CommunesTags({ communes, title, currentCommuneInsee }: CommunesTagsProps) {
  if (communes.length === 0) return null;

  return (
    <section className="fr-py-4w">
      <div className="fr-container">
        <h2>{title}</h2>

        <ul className="fr-tags-group">
          {communes.map((commune) => (
            <li key={commune.codeInsee}>
              <a
                href={`/rga/commune/${commune.slug}`}
                className="fr-tag"
                aria-current={commune.codeInsee === currentCommuneInsee ? "page" : undefined}>
                Risques Retrait-Gonflement des Argiles à {commune.nom} ({commune.codesPostaux.join(", ")})
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
