import { contentTravauxEligiblesDrainageEauxDeportees } from "@/content/travaux-eligibles";
import TravauxEligiblesTemplate from "@/page-sections/travaux-eligibles/TravauxEligiblesTemplate";

export default function DrainageEauxDeportees() {
  return (
    <TravauxEligiblesTemplate
      title={contentTravauxEligiblesDrainageEauxDeportees.title}
      pageLink={contentTravauxEligiblesDrainageEauxDeportees.pageLink}
      tag={contentTravauxEligiblesDrainageEauxDeportees.tag}
      image={contentTravauxEligiblesDrainageEauxDeportees.image}
      une_des_solutions={
        contentTravauxEligiblesDrainageEauxDeportees.une_des_solutions
      }
      solutions={contentTravauxEligiblesDrainageEauxDeportees.solutions}
      pourquoi_solution_efficace={
        contentTravauxEligiblesDrainageEauxDeportees.pourquoi_solution_efficace
      }
      quand_mettre_en_oeuvre={
        contentTravauxEligiblesDrainageEauxDeportees.quand_mettre_en_oeuvre
      }
      a_retenir={contentTravauxEligiblesDrainageEauxDeportees.a_retenir}
    />
  );
}
