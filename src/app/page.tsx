import { Notice } from "@/components";
import {
  // AboutUs,
  // ExplanationCards,
  HeroSection,
  // WhoAreYou,
} from "@/page-sections";

export default function Home() {
  return (
    <>
      <Notice
        className="fr-notice--info"
        description="Dispositif ouvert uniquement dans les départements suivants : 32 • 40 • 47 • 63"
        descriptionLinkText="En savoir plus"
        descriptionLinkHref="/en-savoir-plus"
        title="Phase pilote"
        buttonClose={true}
      />
      <div className="[&_h2]:text-center">
        <HeroSection />
        {/* <ExplanationCards /> */}
        {/* <AboutUs /> */}
        {/* <WhoAreYou /> */}
      </div>
    </>
  );
}
