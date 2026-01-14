"use client";

import { useState, useMemo, useEffect } from "react";
import type { AllersVers } from "@/features/seo/allers-vers";
import { DepartementSelect } from "./DepartementSelect";
import { getDepartementNom } from "@/shared/utils";
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
                // Cas spécial département 54 : sous-groupes Métropole Nancy / Autres
                if (deptCode === "54") {
                  const alohe = conseillers.filter(isAlohe);
                  const autres = conseillers.filter((c) => !isAlohe(c));

                  return (
                    <div key={deptCode} className="fr-mb-8w">
                      <h3 className="fr-mb-3w">{`${deptCode} - ${getDepartementNom(deptCode)}`}</h3>

                      {alohe.length > 0 && (
                        <div className="fr-mb-4w">
                          <p className="fr-mb-2w">Pour la métropole de Nancy</p>
                          <div className="fr-grid-row fr-grid-row--gutters">
                            {alohe.map((conseiller) => (
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
                        </div>
                      )}

                      {autres.length > 0 && (
                        <div className="fr-mb-4w">
                          <p className="fr-mb-2w">Pour toute autre localisation</p>
                          <div className="fr-grid-row fr-grid-row--gutters">
                            {autres.map((conseiller) => (
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
                        </div>
                      )}
                    </div>
                  );
                }

                // Cas standard
                return (
                  <div key={deptCode} className="fr-mb-8w">
                    <h3 className="fr-mb-3w">
                      {deptCode === "autres" ? "Autres" : `${deptCode} - ${getDepartementNom(deptCode)}`}
                    </h3>
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
