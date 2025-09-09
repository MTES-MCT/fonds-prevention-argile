import {
  contentSignesASurveillerCommon,
  contentSignesASurveillerPortesEtFenetreQuiFermentMal,
} from "@/content/signes-a-surveiller";
import { SignesASurveillerTemplate } from "@/page-sections";

export default function PortesEtFenetreQuiFermentMal() {
  return (
    <SignesASurveillerTemplate
      title={contentSignesASurveillerPortesEtFenetreQuiFermentMal.title}
      tag={
        contentSignesASurveillerCommon.signes_a_surveiller_section.signes.find(
          (item) =>
            item.pageLink ===
            "/signes-a-surveiller/portes-et-fenetres-qui-ferment-mal"
        )?.tag
      }
      image={contentSignesASurveillerPortesEtFenetreQuiFermentMal.image}
      ce_qu_il_faut_surveiller={
        contentSignesASurveillerPortesEtFenetreQuiFermentMal.ce_qu_il_faut_surveiller
      }
      signes_alerte={
        contentSignesASurveillerPortesEtFenetreQuiFermentMal.signes_alerte
      }
      conseils_pratiques={
        contentSignesASurveillerPortesEtFenetreQuiFermentMal.conseils_pratiques
      }
      bon_a_savoir={
        contentSignesASurveillerPortesEtFenetreQuiFermentMal.bon_a_savoir
      }
    />
  );
}
