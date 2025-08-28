import { Notice } from "@/components";
import { contentAccessibilityPage } from "@/content";
import { richTextParser } from "@/utils";

export default function Accessibilite() {
  return (
    <>
      <Notice className="fr-notice--info" description="" title="" />
      <section className="fr-container-fluid fr-py-10w">
        <div className="fr-container">
          <h1 className="fr-mb-6w text-[var(--text-title-grey)]!">
            {contentAccessibilityPage.title}
          </h1>
          <p>{richTextParser(contentAccessibilityPage.first_paragraph)}</p>
          <p>{richTextParser(contentAccessibilityPage.second_paragraph)}</p>
          <p>{contentAccessibilityPage.third_paragraph}</p>
          <p>{richTextParser(contentAccessibilityPage.fourth_paragraph)}</p>
        </div>
      </section>
    </>
  );
}
