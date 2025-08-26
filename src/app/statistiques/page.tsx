import { Notice } from "@/components";
import { richTextParser } from "@/utils";
import wording from "@/wording";

export default function Statistiques() {
  return (
    <>
      <Notice className="fr-notice--info" description="" title="" />
      <section className="fr-container-fluid fr-py-10w">
        <div className="fr-container">
          <h1 className="fr-mb-6w text-[var(--text-title-grey)]!">Stats</h1>
          <p>{richTextParser(wording.accessibility.first_paragraph)}</p>
          <p>{richTextParser(wording.accessibility.second_paragraph)}</p>
          <p>{wording.accessibility.third_paragraph}</p>
          <p>{richTextParser(wording.accessibility.fourth_paragraph)}</p>
        </div>
      </section>
    </>
  );
}
