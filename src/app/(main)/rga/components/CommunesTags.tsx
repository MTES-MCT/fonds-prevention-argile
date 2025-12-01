import type { CommuneSEO } from "@/features/seo";

interface CommunesTagsProps {
  communes: CommuneSEO[];
  title: string;
  description?: string;
  currentCommuneInsee?: string;
}

export function CommunesTags({ communes, title, description, currentCommuneInsee }: CommunesTagsProps) {
  if (communes.length === 0) return null;

  return (
    <section className="fr-py-4w">
      <div className="fr-container">
        <h2>{title}</h2>
        {description && <p>{description}</p>}

        <ul className="fr-tags-group">
          {communes.map((commune) => (
            <li key={commune.codeInsee}>
              <a
                href={`/rga/commune/${commune.slug}`}
                className="fr-tag"
                aria-current={commune.codeInsee === currentCommuneInsee ? "page" : undefined}>
                {commune.nom}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
