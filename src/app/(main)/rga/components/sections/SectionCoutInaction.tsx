import richTextParser from "@/shared/utils/richTextParser.utils";
import commonContent from "../../content/common.json";

export function SectionCoutInaction() {
  return (
    <section className="fr-py-4w">
      <div className="fr-container">
        <h2>
          {commonContent.coutInaction.emoji} {commonContent.coutInaction.title}
        </h2>

        {richTextParser(commonContent.coutInaction.content.join("\n"))}
      </div>
    </section>
  );
}
