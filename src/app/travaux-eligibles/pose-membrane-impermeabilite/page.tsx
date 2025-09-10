import { contentTravauxEligiblesPoseMembraneImpermeabilite } from "@/content/travaux-eligibles";
import TravauxEligiblesTemplate from "@/page-sections/travaux-eligibles/TravauxEligiblesTemplate";

export default function PoseMembraneImpermeabilite() {
  return (
    <TravauxEligiblesTemplate
      title={contentTravauxEligiblesPoseMembraneImpermeabilite.title}
      pageLink={contentTravauxEligiblesPoseMembraneImpermeabilite.pageLink}
      tag={contentTravauxEligiblesPoseMembraneImpermeabilite.tag}
      image={contentTravauxEligiblesPoseMembraneImpermeabilite.image}
      une_des_solutions={
        contentTravauxEligiblesPoseMembraneImpermeabilite.une_des_solutions
      }
      solutions={contentTravauxEligiblesPoseMembraneImpermeabilite.solutions}
      pourquoi_solution_efficace={
        contentTravauxEligiblesPoseMembraneImpermeabilite.pourquoi_solution_efficace
      }
      quand_mettre_en_oeuvre={
        contentTravauxEligiblesPoseMembraneImpermeabilite.quand_mettre_en_oeuvre
      }
      a_retenir={contentTravauxEligiblesPoseMembraneImpermeabilite.a_retenir}
    />
  );
}
