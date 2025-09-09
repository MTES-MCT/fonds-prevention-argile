import {
  contentSignesASurveillerCommon,
  contentSignesASurveillerFissuresVerticalesAnglesBatiment,
} from "@/content/signes-a-surveiller";
import { SignesASurveillerTemplate } from "@/page-sections";

export default function FissuresVerticalesAnglesBatiment() {
  return (
    <SignesASurveillerTemplate
      title={contentSignesASurveillerFissuresVerticalesAnglesBatiment.title}
      tag={
        contentSignesASurveillerCommon.signes_a_surveiller_section.signes.find(
          (item) =>
            item.pageLink ===
            "/signes-a-surveiller/fissures-verticales-angles-batiment"
        )?.tag
      }
      image={contentSignesASurveillerFissuresVerticalesAnglesBatiment.image}
      ce_qu_il_faut_surveiller={
        contentSignesASurveillerFissuresVerticalesAnglesBatiment.ce_qu_il_faut_surveiller
      }
      signes_alerte={
        contentSignesASurveillerFissuresVerticalesAnglesBatiment.signes_alerte
      }
      conseils_pratiques={
        contentSignesASurveillerFissuresVerticalesAnglesBatiment.conseils_pratiques
      }
      bon_a_savoir={
        contentSignesASurveillerFissuresVerticalesAnglesBatiment.bon_a_savoir
      }
    />
  );
}
