import { contentTravauxEligiblesMiseEnChargeReseauxEaux } from "@/content/travaux-eligibles";
import TravauxEligiblesTemplate from "@/page-sections/travaux-eligibles/TravauxEligiblesTemplate";

export default function MiseEnChargeReseauxEaux() {
  return (
    <TravauxEligiblesTemplate
      title={contentTravauxEligiblesMiseEnChargeReseauxEaux.title}
      pageLink={contentTravauxEligiblesMiseEnChargeReseauxEaux.pageLink}
      tag={contentTravauxEligiblesMiseEnChargeReseauxEaux.tag}
      image={contentTravauxEligiblesMiseEnChargeReseauxEaux.image}
      une_des_solutions={
        contentTravauxEligiblesMiseEnChargeReseauxEaux.une_des_solutions
      }
      solutions={contentTravauxEligiblesMiseEnChargeReseauxEaux.solutions}
      pourquoi_solution_efficace={
        contentTravauxEligiblesMiseEnChargeReseauxEaux.pourquoi_solution_efficace
      }
      quand_mettre_en_oeuvre={
        contentTravauxEligiblesMiseEnChargeReseauxEaux.quand_mettre_en_oeuvre
      }
      a_retenir={contentTravauxEligiblesMiseEnChargeReseauxEaux.a_retenir}
    />
  );
}
