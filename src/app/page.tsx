import { Notice } from "@/components";
import {
  HeroSection,
  WhatIsRGASection,
  EtatAgitSection,
  CommentCaMarcheSection,
} from "@/page-sections";
import wording from "@/wording";

export default function Home() {
  return (
    <>
      <Notice
        className="fr-notice--info"
        description={wording.homepage.notice.description}
        title={wording.homepage.notice.title}
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
