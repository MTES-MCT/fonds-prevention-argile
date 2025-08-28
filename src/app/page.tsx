import { Notice } from "@/components";
import { contentHomePage } from "@/content";
import { EtatAgitSection, CommentCaMarcheSection } from "@/page-sections";
import LogementConcerneRgaSection from "@/page-sections/home/LogementConcerneRgaSection";
import QuestCeQueLeRgaSection from "@/page-sections/home/QuestCeQueLeRgaSection";
import QuiPeutBeneficierAidesSection from "@/page-sections/home/QuiPeutBeneficierAidesSection";

export default function Home() {
  return (
    <>
      <Notice
        className="fr-notice--info"
        description={contentHomePage.notice.description}
        title={contentHomePage.notice.title}
        buttonClose={true}
      />
      <div className="[&_h2]:text-center">
        <LogementConcerneRgaSection />
        <QuestCeQueLeRgaSection />
        <EtatAgitSection />
        <CommentCaMarcheSection />
        <QuiPeutBeneficierAidesSection />
      </div>
    </>
  );
}
