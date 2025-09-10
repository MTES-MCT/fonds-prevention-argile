import { contentTravauxEligiblesPoseCanalisationEvacuationEauxPluviales } from "@/content/travaux-eligibles";
import TravauxEligiblesTemplate from "@/page-sections/travaux-eligibles/TravauxEligiblesTemplate";

export default function PoseCanalisationEvacuationEauxPluviales() {
  return (
    <TravauxEligiblesTemplate
      title={contentTravauxEligiblesPoseCanalisationEvacuationEauxPluviales.title}
      pageLink={contentTravauxEligiblesPoseCanalisationEvacuationEauxPluviales.pageLink}
      tag={contentTravauxEligiblesPoseCanalisationEvacuationEauxPluviales.tag}
      image={contentTravauxEligiblesPoseCanalisationEvacuationEauxPluviales.image}
      une_des_solutions={
        contentTravauxEligiblesPoseCanalisationEvacuationEauxPluviales.une_des_solutions
      }
      solutions={contentTravauxEligiblesPoseCanalisationEvacuationEauxPluviales.solutions}
      pourquoi_solution_efficace={
        contentTravauxEligiblesPoseCanalisationEvacuationEauxPluviales.pourquoi_solution_efficace
      }
      quand_mettre_en_oeuvre={
        contentTravauxEligiblesPoseCanalisationEvacuationEauxPluviales.quand_mettre_en_oeuvre
      }
      a_retenir={contentTravauxEligiblesPoseCanalisationEvacuationEauxPluviales.a_retenir}
    />
  );
}
