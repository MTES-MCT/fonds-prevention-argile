import { contentTravauxEligiblesSuppressionSystemesRacinaires } from "@/content/travaux-eligibles";
import TravauxEligiblesTemplate from "@/app/travaux-eligibles/components/TravauxEligiblesTemplate";

export default function SuppressionSystemesRacinaires() {
  return (
    <TravauxEligiblesTemplate
      title={contentTravauxEligiblesSuppressionSystemesRacinaires.title}
      pageLink={contentTravauxEligiblesSuppressionSystemesRacinaires.pageLink}
      tag={contentTravauxEligiblesSuppressionSystemesRacinaires.tag}
      image={contentTravauxEligiblesSuppressionSystemesRacinaires.image}
      une_des_solutions={
        contentTravauxEligiblesSuppressionSystemesRacinaires.une_des_solutions
      }
      solutions={contentTravauxEligiblesSuppressionSystemesRacinaires.solutions}
      pourquoi_solution_efficace={
        contentTravauxEligiblesSuppressionSystemesRacinaires.pourquoi_solution_efficace
      }
      quand_mettre_en_oeuvre={
        contentTravauxEligiblesSuppressionSystemesRacinaires.quand_mettre_en_oeuvre
      }
      a_retenir={contentTravauxEligiblesSuppressionSystemesRacinaires.a_retenir}
    />
  );
}
