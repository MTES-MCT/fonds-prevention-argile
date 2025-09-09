import {
  contentSignesASurveillerCommon,
  contentSignesASurveillerMicrofissuresVerticales,
} from "@/content/signes-a-surveiller";
import { SignesASurveillerTemplate } from "@/page-sections";

export default function MicrofissuresHorizontalesVerticales() {
  return (
    <SignesASurveillerTemplate
      title={contentSignesASurveillerMicrofissuresVerticales.title}
      tag={
        contentSignesASurveillerCommon.signes_a_surveiller_section.signes.find(
          (item) =>
            item.pageLink ===
            "/signes-a-surveiller/microfissures-horizontales-verticales"
        )?.tag
      }
      image={contentSignesASurveillerMicrofissuresVerticales.image}
      ce_qu_il_faut_surveiller={
        contentSignesASurveillerMicrofissuresVerticales.ce_qu_il_faut_surveiller
      }
      signes_alerte={
        contentSignesASurveillerMicrofissuresVerticales.signes_alerte
      }
      conseils_pratiques={
        contentSignesASurveillerMicrofissuresVerticales.conseils_pratiques
      }
      bon_a_savoir={
        contentSignesASurveillerMicrofissuresVerticales.bon_a_savoir
      }
    />
  );
}
