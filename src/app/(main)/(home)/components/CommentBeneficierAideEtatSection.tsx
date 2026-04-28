import content from "../content/content.json";
import { richTextParser } from "@/shared/utils";

type Item = { text: string; sublist?: readonly string[] };

function CritereCard({ title, subtitle, items }: { title: string; subtitle: string; items: readonly Item[] }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
      {/* En-tête */}
      <div className="fr-p-4w">
        <h4 className="fr-mb-2v">{title}</h4>
        <p className="fr-text--sm fr-mb-0">{subtitle}</p>
      </div>
      {/* Corps : liste des critères, fond gris clair */}
      <div className="fr-p-4w bg-(--background-alt-grey)">
        <ul className="!list-none !p-0 !m-0">
          {items.map((item, i) => (
            <li key={i} className="fr-mb-3w last:fr-mb-0 !list-none">
              <div className="flex items-start gap-3">
                <span aria-hidden="true" className="fr-icon-checkbox-circle-fill text-green-800 flex-shrink-0 mt-1" />
                <div>{richTextParser(item.text)}</div>
              </div>
              {item.sublist && (
                <ul className="list-disc fr-ml-9w fr-mt-2v">
                  {item.sublist.map((sub, j) => (
                    <li key={j}>{sub}</li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default function CommentBeneficierAideEtatSection() {
  const c = content.comment_beneficier_aide_etat_section;
  return (
    <section className="fr-container-fluid fr-py-10w">
      <div className="fr-container">
        <h2>{c.title}</h2>
        <p>{c.intro_text}</p>
        <ul className="fr-mb-3w">
          {c.intro_items.map((item, i) => (
            <li key={i}>{richTextParser(item)}</li>
          ))}
        </ul>
        <p>{c.intro_after}</p>

        {/* Cartes côte à côte avec flèche entre les deux */}
        <div className="flex flex-col md:flex-row items-stretch gap-4 md:gap-6 fr-mt-6w">
          <div className="flex-1">
            <CritereCard title={c.phase_etude.title} subtitle={c.phase_etude.subtitle} items={c.phase_etude.items} />
          </div>
          <div aria-hidden="true" className="hidden md:flex items-center text-2xl text-gray-700">
            →
          </div>
          <div className="flex-1">
            <CritereCard
              title={c.phase_travaux.title}
              subtitle={c.phase_travaux.subtitle}
              items={c.phase_travaux.items}
            />
          </div>
        </div>

        {/* Callout important : régime catastrophes naturelles */}
        <div className="fr-callout fr-callout--pink-tuile fr-mt-6w">
          <h3 className="fr-callout__title">{c.callout.title}</h3>
          <p className="fr-callout__text">{richTextParser(c.callout.text)}</p>
        </div>
      </div>
    </section>
  );
}
