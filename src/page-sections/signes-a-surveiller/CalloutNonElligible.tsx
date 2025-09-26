import { contentHomePage } from "@/content";

export default function CalloutNonEligible() {
  return (
    <div className="fr-callout fr-icon-warning-fill fr-callout--orange-terre-battue fr-mb-4w">
      <h3 className="fr-callout__title">
        {
          contentHomePage.signes_a_surveiller_section.non_pris_en_charge
            .callout.title
        }
      </h3>
      <p className="fr-callout__text">
        {
          contentHomePage.signes_a_surveiller_section.non_pris_en_charge
            .callout.text
        }
      </p>
    </div>
  );
}
