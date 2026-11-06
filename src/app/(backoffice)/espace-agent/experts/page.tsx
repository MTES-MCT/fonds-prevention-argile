import { exigerAccesEspaceAgent } from "@/features/backoffice/espace-agent/shared/services/acces-espace-agent.service";
import { chargerAnnuaireExperts } from "@/features/backoffice/espace-agent/experts/services/annuaire-experts.service";
import { GrilleExperts } from "./components/GrilleExperts";
import { SelecteurDepartementExperts } from "./components/SelecteurDepartementExperts";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ departement?: string }>;
}

/** Annuaire des experts : un département à la fois, celui du territoire de l'agent par défaut. */
export default async function ExpertsAgentPage({ searchParams }: PageProps) {
  const agent = await exigerAccesEspaceAgent();

  const { departement: demande } = await searchParams;
  const annuaire = await chargerAnnuaireExperts(agent, demande);
  const { departement } = annuaire;

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
          {annuaire.departementsConsultables.length === 0 ? (
            <div className="fr-alert fr-alert--info">
              <p>Aucun département ne vous est rattaché : l&apos;annuaire des experts ne vous est pas accessible.</p>
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between fr-mb-3w">
                <h2 className="fr-h4 fr-mb-0">
                  {departement ? `${departement.nom} (${departement.code})` : "Choisissez un département"}
                </h2>
                <SelecteurDepartementExperts
                  key={departement?.code ?? "aucun"}
                  departementActuel={departement?.code ?? null}
                  departementsConsultables={annuaire.departementsConsultables}
                  departementsDuTerritoire={annuaire.departementsDuTerritoire}
                />
              </div>

              {departement && <GrilleExperts experts={annuaire.experts} codeDepartement={departement.code} />}
            </>
          )}
        </div>
      </section>
    </>
  );
}
