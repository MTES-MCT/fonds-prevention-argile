import commonContent from "../content/common.json";

interface SectionEtatAccompagneProps {
  conclusionLocale?: string;
}

export function SectionEtatAccompagne({ conclusionLocale }: SectionEtatAccompagneProps) {
  return (
    <section className="fr-py-4w">
      <div className="fr-container">
        <h2>
          {commonContent.etatAccompagne.emoji} {commonContent.etatAccompagne.title}
        </h2>
        {commonContent.etatAccompagne.content.map((paragraph, index) => (
          <p key={index}>{paragraph}</p>
        ))}
        <ul>
          {commonContent.etatAccompagne.liste.map((item, index) => (
            <li key={index}>{item}</li>
          ))}
        </ul>
        <p>{conclusionLocale || commonContent.etatAccompagne.conclusion}</p>
      </div>
    </section>
  );
}
