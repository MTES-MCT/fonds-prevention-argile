import {
  contentSignesASurveillerCommon,
  contentSignesASurveillerAffaissementOuSoulèvementDeDallages,
} from "@/content/signes-a-surveiller";
import { SignesASurveillerTemplate } from "@/page-sections";

export default function AffaissementOuSoulevementDeDallages() {
  return (
    <SignesASurveillerTemplate
      title={contentSignesASurveillerAffaissementOuSoulèvementDeDallages.title}
      pageLink="/signes-a-surveiller/affaissement-ou-soulevement-de-dallages"
      tag={
        contentSignesASurveillerCommon.signes_a_surveiller_section.signes.find(
          (item) =>
            item.pageLink ===
            "/signes-a-surveiller/affaissement-ou-soulevement-de-dallages"
        )?.tag
      }
      image={contentSignesASurveillerAffaissementOuSoulèvementDeDallages.image}
      ce_qu_il_faut_surveiller={
        contentSignesASurveillerAffaissementOuSoulèvementDeDallages.ce_qu_il_faut_surveiller
      }
      signes_alerte={
        contentSignesASurveillerAffaissementOuSoulèvementDeDallages.signes_alerte
      }
      conseils_pratiques={
        contentSignesASurveillerAffaissementOuSoulèvementDeDallages.conseils_pratiques
      }
      bon_a_savoir={
        contentSignesASurveillerAffaissementOuSoulèvementDeDallages.bon_a_savoir
      }
    />
  );
}
