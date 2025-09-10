import { contentTravauxEligiblesPoseTrottoirImpermeablePeripherique } from "@/content/travaux-eligibles";
import TravauxEligiblesTemplate from "@/page-sections/travaux-eligibles/TravauxEligiblesTemplate";

export default function PoseTrottoirImpermeablePeripherique() {
  return (
    <TravauxEligiblesTemplate
      title={contentTravauxEligiblesPoseTrottoirImpermeablePeripherique.title}
      pageLink={contentTravauxEligiblesPoseTrottoirImpermeablePeripherique.pageLink}
      tag={contentTravauxEligiblesPoseTrottoirImpermeablePeripherique.tag}
      image={contentTravauxEligiblesPoseTrottoirImpermeablePeripherique.image}
      une_des_solutions={
        contentTravauxEligiblesPoseTrottoirImpermeablePeripherique.une_des_solutions
      }
      solutions={contentTravauxEligiblesPoseTrottoirImpermeablePeripherique.solutions}
      pourquoi_solution_efficace={
        contentTravauxEligiblesPoseTrottoirImpermeablePeripherique.pourquoi_solution_efficace
      }
      quand_mettre_en_oeuvre={
        contentTravauxEligiblesPoseTrottoirImpermeablePeripherique.quand_mettre_en_oeuvre
      }
      a_retenir={contentTravauxEligiblesPoseTrottoirImpermeablePeripherique.a_retenir}
    />
  );
}
