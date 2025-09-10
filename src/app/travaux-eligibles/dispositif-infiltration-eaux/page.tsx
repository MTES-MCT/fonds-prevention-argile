import { contentTravauxEligiblesDispositifInfiltrationEaux } from "@/content/travaux-eligibles";
import TravauxEligiblesTemplate from "@/page-sections/travaux-eligibles/TravauxEligiblesTemplate";

export default function DispositifInfiltrationEaux() {
  return (
    <TravauxEligiblesTemplate
      title={contentTravauxEligiblesDispositifInfiltrationEaux.title}
      pageLink={contentTravauxEligiblesDispositifInfiltrationEaux.pageLink}
      tag={contentTravauxEligiblesDispositifInfiltrationEaux.tag}
      image={contentTravauxEligiblesDispositifInfiltrationEaux.image}
      une_des_solutions={
        contentTravauxEligiblesDispositifInfiltrationEaux.une_des_solutions
      }
      solutions={contentTravauxEligiblesDispositifInfiltrationEaux.solutions}
      pourquoi_solution_efficace={
        contentTravauxEligiblesDispositifInfiltrationEaux.pourquoi_solution_efficace
      }
      quand_mettre_en_oeuvre={
        contentTravauxEligiblesDispositifInfiltrationEaux.quand_mettre_en_oeuvre
      }
      a_retenir={contentTravauxEligiblesDispositifInfiltrationEaux.a_retenir}
    />
  );
}
