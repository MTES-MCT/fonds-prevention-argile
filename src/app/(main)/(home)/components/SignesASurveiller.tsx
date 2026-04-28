import content from "../content/content.json";

export default function SignesASurveiller() {
  return (
    <section className="fr-container-fluid">
      {/*  Signes non pris en charge */}
      <div className="fr-container fr-mb-8w">
        <h2>{content.signes_a_surveiller_section.non_pris_en_charge.title}</h2>
        <p>{content.signes_a_surveiller_section.non_pris_en_charge.subtitle}</p>
        <p>{content.signes_a_surveiller_section.non_pris_en_charge.subtitle2}</p>
      </div>
    </section>
  );
}
