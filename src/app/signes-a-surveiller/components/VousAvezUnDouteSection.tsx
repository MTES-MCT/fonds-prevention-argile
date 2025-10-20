import Image from "next/image";
import Link from "next/link";
import contentDouteSection from "../content/doute-section.json";

export default function VousAvezUnDouteSection() {
  return (
    <section className="fr-container-fluid fr-py-10w bg-[var(--background-alt-blue-france)]">
      <div className="fr-container">
        <div className="fr-grid-row items-center gap-6 md:gap-0">
          {/* Zone texte */}
          <div className="fr-col-12 fr-col-md-6">
            <h2 className="text-left">{contentDouteSection.title}</h2>
            <h2 className="text-left">{contentDouteSection.title2}</h2>
            <h2 className="text-left text-blue-900 ">
              {contentDouteSection.title3}
            </h2>
            <Link
              className="fr-mt-4v fr-btn fr-btn--lg fr-icon-arrow-right-line fr-btn--icon-right"
              href={contentDouteSection.cta_link}
            >
              {contentDouteSection.cta_label}
            </Link>
          </div>

          {/* Zone image */}
          <div className="fr-col-12 fr-col-md-6 flex justify-center md:justify-end">
            <div className="h-[250px] md:h-[376px] relative w-full max-w-[484px]">
              <Image
                alt={contentDouteSection.image.alt}
                className="object-contain"
                fill
                priority
                quality={85}
                sizes="(max-width: 768px) 272px, (max-width: 1024px) 484px, 100vw"
                src={contentDouteSection.image.src}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
