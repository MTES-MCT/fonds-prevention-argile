import { Notice } from "@/components";
import { contentHomePage } from "@/content";
import {
  HeroSection,
  WhatIsRGASection,
  EtatAgitSection,
  CommentCaMarcheSection,
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
      <div className="[&_h2]:text-center">
        <HeroSection />
        <WhatIsRGASection />
        <EtatAgitSection />
        <CommentCaMarcheSection />
      </div>
    </>
  );
}
