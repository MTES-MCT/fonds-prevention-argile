import {
  contentSignesASurveillerCommon,
  contentSignesASurveillerFissuresEscalier,
} from "@/content";
import { SignesASurveillerTemplate } from "@/page-sections";

export default function FissuresEnEscalier() {
  return (
    <SignesASurveillerTemplate
      title={contentSignesASurveillerFissuresEscalier.title}
      tag={
        contentSignesASurveillerCommon.signes_a_surveiller_section.signes.find(
          (item) =>
            item.pageLink === "/signes-a-surveiller/fissures-en-escalier"
        )?.tag
      }
      image={contentSignesASurveillerFissuresEscalier.image}
      ce_qu_il_faut_surveiller={
        contentSignesASurveillerFissuresEscalier.ce_qu_il_faut_surveiller
      }
      signes_alerte={contentSignesASurveillerFissuresEscalier.signes_alerte}
      conseils_pratiques={
        contentSignesASurveillerFissuresEscalier.conseils_pratiques
      }
      bon_a_savoir={contentSignesASurveillerFissuresEscalier.bon_a_savoir}
    />
  );
}
