import Image from "next/image";
import Link from "next/link";

import commonContent from "../../content/common.json";

export function CtaSmall() {
  return (
    <section className="fr-py-6w">
      <div className="fr-container">
        <div
          className="fr-grid-row fr-grid-row--middle fr-grid-row--gutters fr-p-4w fr-p-md-6w"
          style={{ backgroundColor: "var(--background-alt-blue-france)", borderRadius: "8px" }}>
          {/* Zone texte */}
          <div className="fr-col-12 fr-col-md-6">
            <h5>{commonContent.cta.small.text}</h5>
            <Link
              className="fr-mt-4v fr-btn fr-btn--lg fr-icon-arrow-right-line fr-btn--icon-right"
              href={commonContent.cta.small.buttonLink}>
              {commonContent.cta.small.buttonLabel}
            </Link>
          </div>

          {/* Zone image */}
          <div className="fr-col-12 fr-col-md-6">
            <div style={{ position: "relative", height: "250px", width: "100%" }}>
              <Image
                alt={commonContent.cta.small.image.alt}
                fill
                priority
                quality={85}
                sizes="(max-width: 768px) 100vw, 50vw"
                src={commonContent.cta.small.image.src}
                style={{ objectFit: "cover", borderRadius: "4px" }}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
