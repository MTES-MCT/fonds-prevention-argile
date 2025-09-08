import { Notice } from "@/components";
import { contentHomePage } from "@/content";
import {
  EtatAgitSection,
  CommentCaMarcheSection,
  LogementConcerneRgaSection,
  QuestCeQueLeRgaSection,
  SignesASurveiller,
  QuiPeutBeneficierAidesSection,
  QuelsSontTravauxEligiblesSection,
  PourEnSavoirPlusSection,
  FaqSection,
  QuiSommesNousSection,
} from "@/page-sections";
import SavoirSiConcerneSection from "@/page-sections/home/SavoirSiConcerneSection";

export default function Home() {
  return (
    <>
      <Notice
        className="fr-notice--info"
        description={contentHomePage.notice.description}
        title={contentHomePage.notice.title}
        more={contentHomePage.notice.more}
        more_link={contentHomePage.notice.more_link}
        buttonClose={true}
      />
      <div>
        <LogementConcerneRgaSection />
        <QuestCeQueLeRgaSection />
        <SignesASurveiller />
        <SavoirSiConcerneSection />
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
