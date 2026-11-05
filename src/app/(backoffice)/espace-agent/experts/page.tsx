import { exigerAccesEspaceAgent } from "@/features/backoffice/espace-agent/shared/services/acces-espace-agent.service";
import { chargerAnnuaireExperts } from "@/features/backoffice/espace-agent/experts/services/annuaire-experts.service";
import { ListeExperts } from "../shared";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ departement?: string }>;
}

/** Annuaire des experts : un département à la fois, celui du territoire de l'agent par défaut. */
export default async function ExpertsAgentPage({ searchParams }: PageProps) {
  const agent = await exigerAccesEspaceAgent();

  const { departement: demande } = await searchParams;
  const annuaire = await chargerAnnuaireExperts(agent, demande);

  return (
    <section className="fr-container fr-py-4w">
      <h1 className="fr-h2">Experts</h1>

      {annuaire.departementsConsultables.length === 0 ? (
        <div className="fr-alert fr-alert--info">
          <p>Aucun département ne vous est rattaché : l&apos;annuaire des experts ne vous est pas accessible.</p>
        </div>
      ) : (
        <>
          <form method="get" className="flex flex-wrap items-end gap-4 fr-mb-4w">
            <div className="fr-select-group mb-0">
              <label className="fr-label" htmlFor="departement-experts">
                Département
                {annuaire.departementsDuTerritoire.length > 0 && (
                  <span className="fr-hint-text">
                    Votre territoire : {annuaire.departementsDuTerritoire.join(", ")}
                  </span>
                )}
              </label>
              <select
                className="fr-select"
                id="departement-experts"
                name="departement"
                defaultValue={annuaire.departement?.code ?? ""}>
                {!annuaire.departement && <option value="">Sélectionner un département</option>}
                {annuaire.departementsConsultables.map((d) => (
                  <option key={d.code} value={d.code}>
                    {d.code} - {d.nom}
                  </option>
                ))}
              </select>
            </div>
            <button type="submit" className="fr-btn fr-btn--secondary">
              Afficher
            </button>
          </form>

          {annuaire.departement ? (
            <>
              <h2 className="fr-h4">
                {annuaire.departement.nom} ({annuaire.departement.code})
              </h2>
              <ListeExperts experts={annuaire.experts} codeDepartement={annuaire.departement.code} />
            </>
          ) : (
            <p>Choisissez un département pour afficher ses experts.</p>
          )}
        </>
      )}
    </section>
  );
}
