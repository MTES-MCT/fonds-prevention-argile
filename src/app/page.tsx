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

export default function Home() {
  return (
    <>
      <Notice
        className="fr-notice--info"
        description={contentHomePage.notice.description}
        title={contentHomePage.notice.title}
        buttonClose={true}
      />
      <div>
        <LogementConcerneRgaSection />
        <QuestCeQueLeRgaSection />
        <SignesASurveiller />
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
