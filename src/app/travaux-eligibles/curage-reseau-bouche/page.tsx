import { contentTravauxEligiblesCurageReseauBouche } from "@/content/travaux-eligibles";
import TravauxEligiblesTemplate from "@/page-sections/travaux-eligibles/TravauxEligiblesTemplate";

export default function CurageReseauBouche() {
  return (
    <TravauxEligiblesTemplate
      title={contentTravauxEligiblesCurageReseauBouche.title}
      pageLink={contentTravauxEligiblesCurageReseauBouche.pageLink}
      tag={contentTravauxEligiblesCurageReseauBouche.tag}
      image={contentTravauxEligiblesCurageReseauBouche.image}
      une_des_solutions={
        contentTravauxEligiblesCurageReseauBouche.une_des_solutions
      }
      solutions={contentTravauxEligiblesCurageReseauBouche.solutions}
      pourquoi_solution_efficace={
        contentTravauxEligiblesCurageReseauBouche.pourquoi_solution_efficace
      }
      quand_mettre_en_oeuvre={
        contentTravauxEligiblesCurageReseauBouche.quand_mettre_en_oeuvre
      }
      a_retenir={contentTravauxEligiblesCurageReseauBouche.a_retenir}
    />
  );
}
