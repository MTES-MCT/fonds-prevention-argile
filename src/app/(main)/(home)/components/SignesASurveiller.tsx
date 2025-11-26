import CalloutNonEligible from "../../signes-a-surveiller/components/CalloutNonElligible";
import content from "../content/content.json";

export default function SignesASurveiller() {
  return (
    <section className="fr-container-fluid fr-py-10w">
      {/* Signes pris en charge */}

      {/*  Signes non pris en charge */}
      <div className="fr-container fr-mt-8w">
        <h2>{content.signes_a_surveiller_section.non_pris_en_charge.title}</h2>
        <p>{content.signes_a_surveiller_section.non_pris_en_charge.subtitle}</p>
        <p>{content.signes_a_surveiller_section.non_pris_en_charge.subtitle2}</p>
        <CalloutNonEligible />
      </div>
    </section>
  );
}
