import { contentTravauxEligiblesTestPermeabiliteSol } from "@/content/travaux-eligibles";
import TravauxEligiblesTemplate from "@/page-sections/travaux-eligibles/TravauxEligiblesTemplate";

export default function TestPermeabiliteSol() {
  return (
    <TravauxEligiblesTemplate
      title={contentTravauxEligiblesTestPermeabiliteSol.title}
      pageLink={contentTravauxEligiblesTestPermeabiliteSol.pageLink}
      tag={contentTravauxEligiblesTestPermeabiliteSol.tag}
      image={contentTravauxEligiblesTestPermeabiliteSol.image}
      une_des_solutions={
        contentTravauxEligiblesTestPermeabiliteSol.une_des_solutions
      }
      solutions={contentTravauxEligiblesTestPermeabiliteSol.solutions}
      pourquoi_solution_efficace={
        contentTravauxEligiblesTestPermeabiliteSol.pourquoi_solution_efficace
      }
      quand_mettre_en_oeuvre={
        contentTravauxEligiblesTestPermeabiliteSol.quand_mettre_en_oeuvre
      }
      a_retenir={contentTravauxEligiblesTestPermeabiliteSol.a_retenir}
    />
  );
}
