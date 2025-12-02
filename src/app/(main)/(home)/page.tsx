"use client";

import { useLogoutMessage } from "@/features/auth/hooks";
import content from "./content/content.json";
import { Alert, Notice } from "@/shared/components";
import LogementConcerneRgaSection from "./components/LogementConcerneRgaSection";
import QuestCeQueLeRgaSection from "./components/QuestCeQueLeRgaSection";
import SignesASurveiller from "./components/SignesASurveiller";
import EtatAgitSection from "./components/EtatAgitSection";
import QuiPeutBeneficierAidesSection from "./components/QuiPeutBeneficierAidesSection";
import MontantDesAidesSection from "./components/MontantDesAidesSection";
import CommentCaMarcheSection from "./components/CommentCaMarcheSection";
import SavoirSiConcerneSection from "./components/SavoirSiConcerneSection";
import QuelsSontTravauxEligiblesSection from "./components/QuelsSontTravauxEligiblesSection";
import PourEnSavoirPlusSection from "./components/PourEnSavoirPlusSection";
import FaqSection from "./components/FaqSection";
import QuiSommesNousSection from "./components/QuiSommesNousSection";
import { DEPARTEMENTS_ELIGIBLES_RGA } from "@/features/seo";

export default function Home() {
  const { showLogoutMessage, clearLogoutMessage } = useLogoutMessage();

  return (
    <>
      <Notice
        className="fr-notice--info"
        description={`${content.notice.description} ${DEPARTEMENTS_ELIGIBLES_RGA.join(" • ")}`}
        title={content.notice.title}
        more={content.notice.more}
        more_link={content.notice.more_link}
        buttonClose={true}
      />

      {/* Message de déconnexion */}
      <div>
        {showLogoutMessage && (
          <div className="fr-container fr-mt-4w">
            <Alert
              type="success"
              title="Déconnexion réussie"
              description="Vous avez été déconnecté avec succès."
              onClose={clearLogoutMessage}
            />
          </div>
        )}

        <LogementConcerneRgaSection />
        <QuestCeQueLeRgaSection />
        <SignesASurveiller />
        <EtatAgitSection />
        <QuiPeutBeneficierAidesSection />
        <MontantDesAidesSection />
        <CommentCaMarcheSection />
        <SavoirSiConcerneSection />
        <QuelsSontTravauxEligiblesSection />
        <PourEnSavoirPlusSection />
        <FaqSection />
        <QuiSommesNousSection />
      </div>
    </>
  );
}
