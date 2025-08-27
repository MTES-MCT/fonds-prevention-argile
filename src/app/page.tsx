import { Notice } from "@/components";
import {
  // AboutUs,
  // ExplanationCards,
  HeroSection,
  WhatIsRGASection,
  // WhoAreYou,
} from "@/page-sections";

export default function Home() {
  return (
    <>
      <Notice
        className="fr-notice--info"
        description="Dispositif ouvert uniquement dans les départements suivants : 03 • 04 • 24 • 32 • 36 • 47 • 54 • 63 • 81 • 82"
        title="Phase pilote"
        buttonClose={true}
      />
      <div className="[&_h2]:text-center">
        <HeroSection />
        <WhatIsRGASection />
        {/* <ExplanationCards /> */}
        {/* <AboutUs /> */}
        {/* <WhoAreYou /> */}
      </div>
    </>
  );
}
