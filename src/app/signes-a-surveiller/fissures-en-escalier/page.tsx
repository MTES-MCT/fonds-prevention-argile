import content from "./content/content.json";
import commonContent from "../content/common.json";
import { SignesASurveillerTemplate } from "@/page-sections";

export default function FissuresEnEscalier() {
  return (
    <SignesASurveillerTemplate
      title={content.title}
      pageLink="/signes-a-surveiller/fissures-en-escalier"
      tag={
        commonContent.signes_a_surveiller_section.signes.find(
          (item) =>
            item.pageLink === "/signes-a-surveiller/fissures-en-escalier"
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
