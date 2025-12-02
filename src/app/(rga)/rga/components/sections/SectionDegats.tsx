import richTextParser from "@/shared/utils/richTextParser.utils";
import commonContent from "../../content/common.json";

export function SectionDegats() {
  return (
    <section className="fr-py-4w">
      <div className="fr-container">
        <h2>
          {commonContent.degats.emoji} {commonContent.degats.title}
        </h2>
        {commonContent.degats.content.map((paragraph: string, index: number) => (
          <p key={index}>{richTextParser(paragraph)}</p>
        ))}
      </div>
    </section>
  );
}
