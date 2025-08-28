import { Notice } from "@/components";
import { contentHomePage } from "@/content";
import { EtatAgitSection, CommentCaMarcheSection } from "@/page-sections";
import FaqSection from "@/page-sections/home/FaqSection";
import LogementConcerneRgaSection from "@/page-sections/home/LogementConcerneRgaSection";
import PourEnSavoirPlusSection from "@/page-sections/home/PourEnSavoirPlusSection";
import QuelsSontTravauxEligiblesSection from "@/page-sections/home/QuelsSontTravauxEligiblesSection";
import QuestCeQueLeRgaSection from "@/page-sections/home/QuestCeQueLeRgaSection";
import QuiPeutBeneficierAidesSection from "@/page-sections/home/QuiPeutBeneficierAidesSection";
import QuiSommesNousSection from "@/page-sections/home/QuiSommesNousSection";

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
        <QuelsSontTravauxEligiblesSection />
        <PourEnSavoirPlusSection />
        <FaqSection />
        <QuiSommesNousSection />
      </div>
    </>
  );
}
