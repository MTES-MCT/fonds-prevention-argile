"use client";

import { useState, useMemo, useEffect } from "react";
import type { AllersVers } from "@/features/seo/allers-vers";
import { DepartementSelect } from "./DepartementSelect";
import { getDepartementName } from "@/shared/constants/departements.constants";
import { ContactCard } from "@/shared/components";

interface AllersVersWithRelations extends AllersVers {
  departements?: { codeDepartement: string }[];
  epci?: { codeEpci: string }[];
}

interface PageContent {
  title: string;
  subtitle: string;
  filterLabel: string;
  filterPlaceholder: string;
  noResults: string;
  loading: string;
  error: string;
  totalResults: string;
}

interface ConseillersClientProps {
  initialConseillers: AllersVersWithRelations[];
  content: PageContent;
}

// Normalise un nom pour comparaison (uppercase + suppression accents)
function normalizeNom(nom: string): string {
  return nom
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();
}

// Vérifie si c'est le conseiller ALOHÉ
function isAlohe(conseiller: AllersVersWithRelations): boolean {
  return normalizeNom(conseiller.nom || "") === "ALOHE";
}

// Composant de grille réutilisable
function ConseillersGrid({ conseillers }: { conseillers: AllersVersWithRelations[] }) {
  return (
    <div className="fr-grid-row fr-grid-row--gutters">
      {conseillers.map((conseiller) => (
        <ContactCard
          key={conseiller.id}
          id={conseiller.id}
          nom={conseiller.nom}
          emails={conseiller.emails}
          telephone={conseiller.telephone}
          adresse={conseiller.adresse}
          selectable={false}
          colSize="third"
        />
      ))}
    </div>
  );
}

// Configuration déclarative des sous-groupes par département
const SUBGROUPS_BY_DEPT: Record<string, { label: string; match: (c: AllersVersWithRelations) => boolean }[]> = {
  "54": [
    {
      label: "Pour la métropole de Nancy",
      match: isAlohe,
    },
    {
      label: "Pour toute autre localisation",
      match: (c) => !isAlohe(c),
    },
  ],
  "59": [
    {
      label: "Pour la métropole Européenne de Lille",
      match: (c) => normalizeNom(c.nom ?? "") === "SOLIHA METROPOLE NORD",
    },
    {
      label: "Pour les arrondissements de Dunkerque",
      match: (c) => normalizeNom(c.nom ?? "") === "SOLIHA HAUTS-DE-FRANCE",
    },
    {
      label: "Pour la CC Pévèle-Carembault et les CA du Douaisis et Coeur d'Ostrevent",
      match: (c) => normalizeNom(c.nom ?? "") === "SOLIHA DOUAISIS",
    },
    {
      label: "Pour les arrondissements de Valenciennes et de Cambrai",
      match: (c) => normalizeNom(c.nom ?? "") === "SOLIHA HAINAUT CAMBRESIS",
    },
    {
      label: "Pour l'arrondissement d'Avesnes-sur-Helpe",
      match: (c) => normalizeNom(c.nom ?? "") === "SOLIHA SAMBRE AVESNOIS",
    },
  ],
};

export function ConseillersClient({ initialConseillers, content }: ConseillersClientProps) {
  const [selectedDepartement, setSelectedDepartement] = useState<string>("");

  // Scroll to top au montage
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Extraire tous les codes départements uniques
  const availableDepartements = useMemo(() => {
    const deptSet = new Set<string>();

    initialConseillers.forEach((conseiller) => {
      conseiller.departements?.forEach((dept) => {
        deptSet.add(dept.codeDepartement);
      });
    });

    return Array.from(deptSet).sort();
  }, [initialConseillers]);

  // Filtrer les conseillers par département sélectionné
  const filteredConseillers = useMemo(() => {
    if (!selectedDepartement) {
      return initialConseillers;
    }

    return initialConseillers.filter((conseiller) =>
      conseiller.departements?.some((dept) => dept.codeDepartement === selectedDepartement)
    );
  }, [initialConseillers, selectedDepartement]);

  // Grouper les conseillers par département
  const conseillersGroupedByDepartement = useMemo(() => {
    const grouped = new Map<string, AllersVersWithRelations[]>();

    filteredConseillers.forEach((conseiller) => {
      const depts = conseiller.departements || [];

      if (depts.length === 0) {
        // Conseillers sans département assigné
        const key = "autres";
        if (!grouped.has(key)) {
          grouped.set(key, []);
        }
        grouped.get(key)?.push(conseiller);
      } else {
        depts.forEach((dept) => {
          // Si un filtre est actif, ne grouper que sous ce département
          if (selectedDepartement && dept.codeDepartement !== selectedDepartement) {
            return;
          }

          const key = dept.codeDepartement;
          if (!grouped.has(key)) {
            grouped.set(key, []);
          }
          // Éviter les doublons dans le même groupe
          const existing = grouped.get(key);
          if (existing && !existing.find((c) => c.id === conseiller.id)) {
            existing.push(conseiller);
          }
        });
      }
    });

    // Trier par code département
    return new Map([...grouped.entries()].sort((a, b) => a[0].localeCompare(b[0])));
  }, [filteredConseillers, selectedDepartement]);

  const totalCount = filteredConseillers.length;

  return (
    <>
      <section className="fr-mb-6w">
        <div className="fr-container">
          <h1>{content.title}</h1>
          <p className="fr-mb-6w">{content.subtitle}</p>
        </div>
      </section>

      <section className="fr-p-6w bg-[var(--background-alt-blue-france)]">
        <div className="fr-container">
          {/* Filtre */}
          <div className="fr-mb-8w">
            <div className="fr-grid-row">
              <div className="fr-col-12 fr-col-md-6 fr-col-lg-4">
                <DepartementSelect
                  value={selectedDepartement}
                  onChange={setSelectedDepartement}
                  availableDepartements={availableDepartements}
                  label={content.filterLabel}
                  placeholder={content.filterPlaceholder}
                />
              </div>
            </div>
          </div>

          {/* Liste groupée par département */}
          {totalCount === 0 ? (
            <div className="fr-callout">
              <p className="fr-callout__text">{content.noResults}</p>
            </div>
          ) : (
            <div>
              {Array.from(conseillersGroupedByDepartement.entries()).map(([deptCode, conseillers]) => {
                
                const title = deptCode === "autres" ? "Autres" : `${deptCode} - ${getDepartementName(deptCode)}`;
                const subgroups = SUBGROUPS_BY_DEPT[deptCode];

                return (
                  <div key={deptCode} className="fr-mb-8w">
                    <h3 className="fr-mb-3w">{title}</h3>

                    {subgroups ? (
                      // Département avec sous-groupes
                      subgroups.map(({ label, match }) => {
                        const subset = conseillers.filter(match);
                        if (subset.length === 0) return null;
                        return (
                          <div key={label} className="fr-mb-4w">
                            <p className="fr-mb-2w">{label}</p>
                            <ConseillersGrid conseillers={subset} />
                          </div>
                        );
                      })
                    ) : (
                      // Cas standard
                      <ConseillersGrid conseillers={conseillers} />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
