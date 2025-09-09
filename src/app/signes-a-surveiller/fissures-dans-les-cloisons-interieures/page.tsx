import {
  contentSignesASurveillerCommon,
  contentSignesASurveillerFissuresDansLesCloisonsInterieures,
} from "@/content/signes-a-surveiller";
import { SignesASurveillerTemplate } from "@/page-sections";

export default function FissuresDansLesCloisonsInterieures() {
  return (
    <SignesASurveillerTemplate
      title={contentSignesASurveillerFissuresDansLesCloisonsInterieures.title}
      tag={
        contentSignesASurveillerCommon.signes_a_surveiller_section.signes.find(
          (item) =>
            item.pageLink ===
            "/signes-a-surveiller/fissures-dans-les-cloisons-interieures"
        )?.tag
      }
      image={contentSignesASurveillerFissuresDansLesCloisonsInterieures.image}
      ce_qu_il_faut_surveiller={
        contentSignesASurveillerFissuresDansLesCloisonsInterieures.ce_qu_il_faut_surveiller
      }
      signes_alerte={
        contentSignesASurveillerFissuresDansLesCloisonsInterieures.signes_alerte
      }
      conseils_pratiques={
        contentSignesASurveillerFissuresDansLesCloisonsInterieures.conseils_pratiques
      }
      bon_a_savoir={
        contentSignesASurveillerFissuresDansLesCloisonsInterieures.bon_a_savoir
      }
    />
  );
}
