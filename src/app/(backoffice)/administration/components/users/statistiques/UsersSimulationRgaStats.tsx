"use client";

import { calculerTrancheRevenu, TrancheRevenuRga } from "@/features/simulateur";
import StatCard from "../../shared/StatCard";
import { UserWithParcoursDetails } from "@/features/backoffice";

interface UsersSimulationRgaStatsProps {
  users: UserWithParcoursDetails[];
  selectedDepartement: string;
}

export function UsersSimulationRgaStats({ users, selectedDepartement }: UsersSimulationRgaStatsProps) {
  // Filtrer les users qui ont des données RGA (dans rgaSimulation au niveau racine)
  const usersAvecRga = users.filter((u) => u.rgaSimulation?.logement);

  // Stats sur les fissures
  const statsAvecFissures = usersAvecRga.filter((u) => {
    const sinistres = u.rgaSimulation?.rga?.sinistres;
    return sinistres && sinistres !== "saine";
  }).length;

  const statsSansFissures = usersAvecRga.filter((u) => {
    const sinistres = u.rgaSimulation?.rga?.sinistres;
    return sinistres === "saine";
  }).length;

  // Stats sur les tranches de revenus
  const statsParTranche: Record<TrancheRevenuRga, number> = {
    "très modeste": 0,
    modeste: 0,
    intermédiaire: 0,
    supérieure: 0,
  };

  usersAvecRga.forEach((u) => {
    const rga = u.rgaSimulation;
    if (rga?.menage?.revenu_rga !== undefined && rga?.menage?.personnes) {
      const estIDF = rga.logement?.code_region === "11"; // Code région Île-de-France
      const tranche = calculerTrancheRevenu(rga.menage.revenu_rga, rga.menage.personnes, estIDF);
      statsParTranche[tranche]++;
    }
  });

  // Stats sur l'indemnisation
  const statsAvecIndemnisation = usersAvecRga.filter((u) => {
    return u.rgaSimulation?.rga?.indemnise_indemnise_rga === true;
  }).length;

  const statsSansIndemnisation = usersAvecRga.filter((u) => {
    return u.rgaSimulation?.rga?.indemnise_indemnise_rga === false;
  }).length;

  // Stats par département (top 5)
  const statsByDepartement = usersAvecRga.reduce(
    (acc, u) => {
      const dept = u.rgaSimulation?.logement?.code_departement;
      if (dept) {
        acc[dept] = (acc[dept] || 0) + 1;
      }
      return acc;
    },
    {} as Record<string, number>
  );

  const topDepartements = Object.entries(statsByDepartement)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  // Stats par commune (top 5)
  const statsByCommune = usersAvecRga.reduce(
    (acc, u) => {
      const commune = u.rgaSimulation?.logement?.commune_nom;
      if (commune) {
        acc[commune] = (acc[commune] || 0) + 1;
      }
      return acc;
    },
    {} as Record<string, number>
  );

  const topCommunes = Object.entries(statsByCommune)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  return (
    <div>
      {/* Vue d'ensemble */}
      <div className="fr-mb-6w">
        <p className="fr-h6 fr-mb-2w">Données de simulation</p>
        <div className="fr-grid-row fr-grid-row--gutters">
          <StatCard
            number={usersAvecRga.length.toString()}
            label={`Simulations ${selectedDepartement ? "filtrées" : "réalisées"}`}
          />
          <StatCard number={statsAvecFissures.toString()} label="Avec micro-fissures" />
          <StatCard number={statsSansFissures.toString()} label="Sans micro-fissures" />
        </div>
      </div>

      {/* Statistiques sur l'indemnisation */}
      <div className="fr-mb-6w">
        <p className="fr-h6 fr-mb-2w">Indemnisation précédente</p>
        <div className="fr-grid-row fr-grid-row--gutters">
          <StatCard number={statsAvecIndemnisation.toString()} label="Déjà indemnisés" />
          <StatCard number={statsSansIndemnisation.toString()} label="Non indemnisés" />
        </div>
      </div>

      {/* Répartition par tranche de revenus */}
      {usersAvecRga.length > 0 && (
        <div className="fr-mb-6w">
          <p className="fr-h6 fr-mb-2w">Répartition par tranche de revenus</p>
          <p className="fr-text--sm fr-text-mention--grey fr-mb-2w">
            Tranches de revenus selon le barème ANAH (TMO = Très Modeste, MO = Modeste, Int = Intermédiaire).
          </p>

          <div className="fr-grid-row fr-grid-row--gutters">
            <StatCard
              className="fr-col-12 fr-col-md-3"
              label="Très modeste"
              number={statsParTranche["très modeste"].toString()}
            />
            <StatCard
              className="fr-col-12 fr-col-md-3"
              label="Modeste"
              number={statsParTranche["modeste"].toString()}
            />
            <StatCard
              className="fr-col-12 fr-col-md-3"
              label="Intermédiaire"
              number={statsParTranche["intermédiaire"].toString()}
            />
            <StatCard
              className="fr-col-12 fr-col-md-3"
              label="Supérieure"
              number={statsParTranche["supérieure"].toString()}
            />
          </div>
        </div>
      )}

      {/* Top 5 départements et communes sur la même ligne */}
      {(topDepartements.length > 0 || topCommunes.length > 0) && (
        <div className="fr-grid-row fr-grid-row--gutters ">
          {/* Top 5 départements */}
          {topDepartements.length > 0 && (
            <div className="fr-col-12 fr-col-md-6">
              <h2 className="fr-h6 fr-mb-2w">Top 5 des départements</h2>
              <div className="fr-table fr-table--bordered">
                <table>
                  <thead>
                    <tr>
                      <th>Département</th>
                      <th className="fr-text--right">Simulations</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topDepartements.map(([dept, count]) => (
                      <tr key={dept}>
                        <td>{dept}</td>
                        <td className="fr-text--right">{count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Top 5 communes */}
          {topCommunes.length > 0 && (
            <div className="fr-col-12 fr-col-md-6">
              <h2 className="fr-h6 fr-mb-2w">Top 5 des communes</h2>
              <div className="fr-table fr-table--bordered">
                <table>
                  <thead>
                    <tr>
                      <th>Commune</th>
                      <th className="fr-text--right">Simulations</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topCommunes.map(([commune, count]) => (
                      <tr key={commune}>
                        <td>{commune}</td>
                        <td className="fr-text--right">{count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
