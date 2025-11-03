import content from "./content/content.json";
import commonContent from "../content/common.json";
import SignesASurveillerTemplate from "../components/SignesASurveillerTemplate";

export default function DecollementEntreLaCloisonEtLePlafond() {
  return (
    <SignesASurveillerTemplate
      title={content.title}
      pageLink="/signes-a-surveiller/decollement-entre-la-cloison-et-le-plafond"
      tag={
        commonContent.signes_a_surveiller_section.signes.find(
          (item) =>
            item.pageLink ===
            "/signes-a-surveiller/decollement-entre-la-cloison-et-le-plafond"
        )?.tag
      }
      image={content.image}
      ce_qu_il_faut_surveiller={content.ce_qu_il_faut_surveiller}
      signes_alerte={content.signes_alerte}
      conseils_pratiques={content.conseils_pratiques}
      bon_a_savoir={content.bon_a_savoir}
    />
  );
}
