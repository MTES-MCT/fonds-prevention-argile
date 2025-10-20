"use client";

import content from "./content/content.json";
import { Notice, Alert } from "@/components";
import { useLogoutMessage } from "@/lib/auth/client";
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
import MontantDesAidesSection from "@/page-sections/home/MontantDesAidesSection";
import SavoirSiConcerneSection from "@/page-sections/home/SavoirSiConcerneSection";

export default function Home() {
  const { showLogoutMessage, clearLogoutMessage } = useLogoutMessage();

  return (
    <>
      <Notice
        className="fr-notice--info"
        description={content.notice.description}
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
