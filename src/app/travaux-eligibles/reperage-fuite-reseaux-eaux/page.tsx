import { contentTravauxEligiblesReperageFuiteReseauxEaux } from "@/content/travaux-eligibles";
import TravauxEligiblesTemplate from "@/page-sections/travaux-eligibles/TravauxEligiblesTemplate";

export default function ReperageFuiteReseauxEaux() {
  return (
    <TravauxEligiblesTemplate
      title={contentTravauxEligiblesReperageFuiteReseauxEaux.title}
      pageLink={contentTravauxEligiblesReperageFuiteReseauxEaux.pageLink}
      tag={contentTravauxEligiblesReperageFuiteReseauxEaux.tag}
      image={contentTravauxEligiblesReperageFuiteReseauxEaux.image}
      une_des_solutions={
        contentTravauxEligiblesReperageFuiteReseauxEaux.une_des_solutions
      }
      solutions={contentTravauxEligiblesReperageFuiteReseauxEaux.solutions}
      pourquoi_solution_efficace={
        contentTravauxEligiblesReperageFuiteReseauxEaux.pourquoi_solution_efficace
      }
      quand_mettre_en_oeuvre={
        contentTravauxEligiblesReperageFuiteReseauxEaux.quand_mettre_en_oeuvre
      }
      a_retenir={contentTravauxEligiblesReperageFuiteReseauxEaux.a_retenir}
    />
  );
}
