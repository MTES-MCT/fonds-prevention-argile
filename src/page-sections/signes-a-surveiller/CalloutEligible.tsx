import { contentHomePage } from "@/content";
import Link from "next/link";

export default function CalloutEligible() {
  return (
    <div className="fr-callout fr-icon-checkbox-circle-fill fr-callout--green-emeraude fr-mb-4w">
      <h3 className="fr-callout__title">
        {
          contentHomePage.signes_a_surveiller_section.pris_en_charge.callout
            .title
        }
      </h3>
      <p className="fr-callout__text">
        {
          contentHomePage.signes_a_surveiller_section.pris_en_charge.callout
            .text
        }
      </p>
      <Link
        href={
          contentHomePage.signes_a_surveiller_section.pris_en_charge.callout
            .cta_url
        }
        rel="noopener noreferrer"
        className="fr-btn fr-btn--icon-right fr-icon-arrow-right-s-line"
      >
        {
          contentHomePage.signes_a_surveiller_section.pris_en_charge.callout
            .cta_label
        }
      </Link>
    </div>
  );
}
