import { exigerAccesEspaceAgent } from "@/features/backoffice/espace-agent/shared/services/acces-espace-agent.service";
import { chargerAnnuaireExperts } from "@/features/backoffice/espace-agent/experts/services/annuaire-experts.service";
import { ExpertsParDepartement, GrilleExperts } from "./components/GrilleExperts";
import { SelecteurDepartementExperts } from "./components/SelecteurDepartementExperts";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ departement?: string }>;
}

/** Annuaire des experts : un département, le territoire de l'agent, ou tous ses départements regroupés. */
export default async function ExpertsAgentPage({ searchParams }: PageProps) {
  const agent = await exigerAccesEspaceAgent();

  const { departement: demande } = await searchParams;
  const annuaire = await chargerAnnuaireExperts(agent, demande);
  const { vue, sections } = annuaire;
  // L'analyste ne voit que son territoire : « tous » ne vaut que pour ses départements.
  const libelleTous = annuaire.perimetre === "territoire" ? "Tous vos départements" : "Tous les départements";
  const seul = vue?.type === "departement" ? sections[0] : null;
  const titre = seul ? `${seul.nom} (${seul.code})` : vue?.type === "territoire" ? "Votre territoire" : libelleTous;

  return (
    <>
      <div className="fr-container fr-py-6w">
        <h1 className="fr-h1 fr-mb-0">Experts</h1>
        <p className="fr-mt-2w fr-mb-0 fr-text--xl fr-text-mention--grey">
          Les experts RGA validés par la DHUP, département par département
        </p>
      </div>

      <section className="fr-container-fluid fr-py-8w bg-(--background-alt-blue-france)">
        <div className="fr-container">
          {!vue ? (
            <div className="fr-alert fr-alert--info">
              <p>Aucun département ne vous est rattaché : l&apos;annuaire des experts ne vous est pas accessible.</p>
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between fr-mb-3w">
                <h2 className="fr-h4 fr-mb-0">{titre}</h2>
                <SelecteurDepartementExperts
                  key={seul?.code ?? vue.type}
                  valeurActuelle={seul?.code ?? vue.type}
                  departementsConsultables={annuaire.departementsConsultables}
                  departementsDuTerritoire={annuaire.departementsDuTerritoire}
                  libelleTous={libelleTous}
                  territoireRegroupable={annuaire.perimetre === "tous" && annuaire.departementsDuTerritoire.length > 1}
                />
              </div>

              {seul ? (
                <GrilleExperts experts={seul.experts} codeDepartement={seul.code} />
              ) : (
                <ExpertsParDepartement sections={sections} />
              )}
            </>
          )}
        </div>
      </section>
    </>
  );
}
