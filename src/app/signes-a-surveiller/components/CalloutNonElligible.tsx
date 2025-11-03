import homeContent from "../../(home)/content/content.json";

export default function CalloutNonEligible() {
  return (
    <div className="fr-callout fr-icon-warning-fill fr-callout--orange-terre-battue fr-mb-4w">
      <h3 className="fr-callout__title">
        {
          homeContent.signes_a_surveiller_section.non_pris_en_charge.callout
            .title
        }
      </h3>
      <p className="fr-callout__text">
        {
          homeContent.signes_a_surveiller_section.non_pris_en_charge.callout
            .text
        }
      </p>
    </div>
  );
}
