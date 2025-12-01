import TravauxEligiblesTemplate from "../components/TravauxEligiblesTemplate";
import content from "./content/content.json";

export default function DrainageEauxDeportees() {
  return (
    <TravauxEligiblesTemplate
      title={content.title}
      pageLink={content.pageLink}
      tag={content.tag}
      image={content.image}
      une_des_solutions={content.une_des_solutions}
      solutions={content.solutions}
      pourquoi_solution_efficace={content.pourquoi_solution_efficace}
      quand_mettre_en_oeuvre={content.quand_mettre_en_oeuvre}
      a_retenir={content.a_retenir}
    />
  );
}
