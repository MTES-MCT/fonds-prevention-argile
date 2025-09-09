import {
  contentSignesASurveillerCommon,
  contentSignesASurveillerFissuresHorizontalesPlancher,
} from "@/content/signes-a-surveiller";
import { SignesASurveillerTemplate } from "@/page-sections";

export default function FissuresHorizontalesPlancher() {
  return (
    <SignesASurveillerTemplate
      title={contentSignesASurveillerFissuresHorizontalesPlancher.title}
      tag={
        contentSignesASurveillerCommon.signes_a_surveiller_section.signes.find(
          (item) =>
            item.pageLink ===
            "/signes-a-surveiller/fissures-horizontales-plancher"
        )?.tag
      }
      image={contentSignesASurveillerFissuresHorizontalesPlancher.image}
      ce_qu_il_faut_surveiller={
        contentSignesASurveillerFissuresHorizontalesPlancher.ce_qu_il_faut_surveiller
      }
      signes_alerte={
        contentSignesASurveillerFissuresHorizontalesPlancher.signes_alerte
      }
      conseils_pratiques={
        contentSignesASurveillerFissuresHorizontalesPlancher.conseils_pratiques
      }
      bon_a_savoir={
        contentSignesASurveillerFissuresHorizontalesPlancher.bon_a_savoir
      }
    />
  );
}
