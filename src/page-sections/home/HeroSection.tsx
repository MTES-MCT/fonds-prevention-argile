import Image from "next/image";

import { Link } from "@/components";
import wording from "@/wording";

export default function HeroSection() {
  return (
    <section className="fr-container-fluid fr-py-10w bg-[var(--background-default-grey-hover)]">
      <div className="fr-container">
        <div className="flex flex-col md:flex-row md:justify-between justify-center md:items-start items-center">
          <div className="fr-col-12 fr-col-md-6">
            <h1>{wording.homepage.hero_section.title}</h1>
            <p>{wording.homepage.hero_section.subtitle}</p>
            <Link {...wording.homepage.check_eligibility} />
          </div>
          <div className="mt-10 md:mt-0 flex justify-center relative h-[250px] md:h-[300px] lg:h-[376px] w-full max-w-[484px]">
            <Image
              alt={wording.homepage.hero_section.image.alt}
              className="object-contain"
              fill
              priority
              quality={85}
              sizes="(max-width: 768px) 272px, (max-width: 1024px) 484px, 100vw"
              src={wording.homepage.hero_section.image.src}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
