import richTextParser from "@/shared/utils/richTextParser.utils";
import commonContent from "../../content/common.json";

export function SectionEtatAccompagne({ conclusionLocale }: { conclusionLocale?: string }) {
  return (
    <section className="fr-py-4w">
      <div className="fr-container">
        <h2>
          {commonContent.etatAccompagne.emoji} {commonContent.etatAccompagne.title}
        </h2>
        {commonContent.etatAccompagne.content.map((paragraph, index) => (
          <p key={index}>{richTextParser(paragraph)}</p>
        ))}
        <ul>
          {commonContent.etatAccompagne.liste.map((item, index) => (
            <li key={index}>{richTextParser(item)}</li>
          ))}
        </ul>
        <p>{richTextParser(conclusionLocale ?? commonContent.etatAccompagne.conclusion)}</p>
      </div>
    </section>
  );
}
