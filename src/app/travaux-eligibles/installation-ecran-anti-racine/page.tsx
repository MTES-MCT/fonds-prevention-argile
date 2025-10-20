import { contentTravauxEligiblesInstallationEcranAntiRacine } from "@/content/travaux-eligibles";
import TravauxEligiblesTemplate from "@/app/travaux-eligibles/components/TravauxEligiblesTemplate";

export default function InstallationEcranAntiRacine() {
  return (
    <TravauxEligiblesTemplate
      title={contentTravauxEligiblesInstallationEcranAntiRacine.title}
      pageLink={contentTravauxEligiblesInstallationEcranAntiRacine.pageLink}
      tag={contentTravauxEligiblesInstallationEcranAntiRacine.tag}
      image={contentTravauxEligiblesInstallationEcranAntiRacine.image}
      une_des_solutions={
        contentTravauxEligiblesInstallationEcranAntiRacine.une_des_solutions
      }
      solutions={contentTravauxEligiblesInstallationEcranAntiRacine.solutions}
      pourquoi_solution_efficace={
        contentTravauxEligiblesInstallationEcranAntiRacine.pourquoi_solution_efficace
      }
      quand_mettre_en_oeuvre={
        contentTravauxEligiblesInstallationEcranAntiRacine.quand_mettre_en_oeuvre
      }
      a_retenir={contentTravauxEligiblesInstallationEcranAntiRacine.a_retenir}
    />
  );
}
