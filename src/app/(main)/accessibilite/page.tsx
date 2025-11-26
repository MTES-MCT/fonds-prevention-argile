import content from "./content/content.json";
import { richTextParser } from "@/shared/utils";

export default function Accessibilite() {
  return (
    <section className="fr-container-fluid fr-py-10w">
      <div className="fr-container">
        <h1 className="fr-mb-6w text-[var(--text-title-grey)]!">
          {content.title}
        </h1>
        <p>{richTextParser(content.first_paragraph)}</p>
        <p>{richTextParser(content.second_paragraph)}</p>
        <p>{content.third_paragraph}</p>
        <p>{richTextParser(content.fourth_paragraph)}</p>
      </div>
    </section>
  );
}
