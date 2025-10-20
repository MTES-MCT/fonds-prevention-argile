import content from "./content/content.json";
import commonContent from "../content/common.json";
import { SignesASurveillerTemplate } from "@/page-sections";

export default function MicrofissuresHorizontalesVerticales() {
  return (
    <SignesASurveillerTemplate
      title={contentSignesASurveillerFissuresVerticalesAnglesBatiment.title}
      pageLink="/signes-a-surveiller/microfissures-horizontales-verticales"
      tag={
        contentSignesASurveillerCommon.signes_a_surveiller_section.signes.find(
          (item) =>
            item.pageLink ===
            "/signes-a-surveiller/microfissures-horizontales-verticales"
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
