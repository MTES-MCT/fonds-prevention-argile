import {
  contentSignesASurveillerCommon,
  contentSignesASurveillerDecollementEntreLaCloisonEtLePlafond,
} from "@/content/signes-a-surveiller";
import { SignesASurveillerTemplate } from "@/page-sections";

export default function DecollementEntreLaCloisonEtLePlafond() {
  return (
    <SignesASurveillerTemplate
      title={contentSignesASurveillerDecollementEntreLaCloisonEtLePlafond.title}
      pageLink="/signes-a-surveiller/decollement-entre-la-cloison-et-le-plafond"
      tag={
        contentSignesASurveillerCommon.signes_a_surveiller_section.signes.find(
          (item) =>
            item.pageLink ===
            "/signes-a-surveiller/decollement-entre-la-cloison-et-le-plafond"
        )?.tag
      }
      image={contentSignesASurveillerDecollementEntreLaCloisonEtLePlafond.image}
      ce_qu_il_faut_surveiller={
        contentSignesASurveillerDecollementEntreLaCloisonEtLePlafond.ce_qu_il_faut_surveiller
      }
      signes_alerte={
        contentSignesASurveillerDecollementEntreLaCloisonEtLePlafond.signes_alerte
      }
      conseils_pratiques={
        contentSignesASurveillerDecollementEntreLaCloisonEtLePlafond.conseils_pratiques
      }
      bon_a_savoir={
        contentSignesASurveillerDecollementEntreLaCloisonEtLePlafond.bon_a_savoir
      }
    />
  );
}
