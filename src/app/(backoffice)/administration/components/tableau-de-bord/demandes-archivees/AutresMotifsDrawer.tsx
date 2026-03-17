"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { getAutresDemandesArchiveesAction } from "@/features/backoffice/administration/tableau-de-bord/actions/tableau-de-bord.actions";
import { PERIODES } from "@/features/backoffice/administration/tableau-de-bord/domain/types/tableau-de-bord.types";
import type {
  PeriodeId,
  DemandeArchiveeDetail,
} from "@/features/backoffice/administration/tableau-de-bord/domain/types/tableau-de-bord.types";
import type { DepartementDisponible } from "@/features/backoffice/administration/statistiques/domain/types";
import { DemandeArchiveeCard } from "./DemandeArchiveeCard";

interface AutresMotifsDrawerProps {
  drawerId: string;
  /** Période courante du tableau de bord */
  periodeId: PeriodeId;
  /** Code département courant du tableau de bord */
  codeDepartement: string;
  /** Liste des départements disponibles pour le filtre */
  departements: DepartementDisponible[];
}

/**
 * Panneau latéral (drawer) affichant le détail individuel des demandes
 * archivées dont le motif n'est pas dans le top 5.
 *
 * Inclut des filtres contextuels période et département.
 */
export function AutresMotifsDrawer({
  drawerId,
  periodeId: periodeInitiale,
  codeDepartement: departementInitial,
  departements,
}: AutresMotifsDrawerProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  // Filtres locaux du drawer
  const [periodeId, setPeriodeId] = useState<PeriodeId>(periodeInitiale);
  const [codeDepartement, setCodeDepartement] = useState<string>(departementInitial);
  const [demandes, setDemandes] = useState<DemandeArchiveeDetail[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  // Synchroniser les filtres initiaux quand le parent change
  useEffect(() => {
    setPeriodeId(periodeInitiale);
    setCodeDepartement(departementInitial);
  }, [periodeInitiale, departementInitial]);

  // Charger les données quand les filtres changent et le drawer est ouvert
  const loadDemandes = useCallback(async () => {
    if (!isOpen) return;

    setLoading(true);
    const result = await getAutresDemandesArchiveesAction(periodeId, codeDepartement || undefined);
    if (result.success) {
      setDemandes(result.data.demandes);
      setTotal(result.data.total);
    }
    setLoading(false);
  }, [periodeId, codeDepartement, isOpen]);

  useEffect(() => {
    loadDemandes();
  }, [loadDemandes]);

  // Ecouter l'ouverture / fermeture DSFR
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleDisclose = () => {
      setIsOpen(true);
    };

    const handleConceal = () => {
      setIsOpen(false);
      // Réinitialiser les filtres aux valeurs du parent à la fermeture
      setPeriodeId(periodeInitiale);
      setCodeDepartement(departementInitial);
    };

    dialog.addEventListener("dsfr.disclose", handleDisclose);
    dialog.addEventListener("dsfr.conceal", handleConceal);
    return () => {
      dialog.removeEventListener("dsfr.disclose", handleDisclose);
      dialog.removeEventListener("dsfr.conceal", handleConceal);
    };
  }, [periodeInitiale, departementInitial]);

  return (
    <dialog ref={dialogRef} id={drawerId} className="fr-modal" aria-labelledby={`${drawerId}-title`}>
      {/* Override DSFR max-height pour forcer pleine hauteur */}
      <style>{`
        #${CSS.escape(drawerId)} .fr-modal__body {
          max-height: 100vh !important;
          min-height: 100vh !important;
          height: 100vh !important;
        }
      `}</style>
      <div className="fr-container fr-container--fluid fr-container-md">
        <div className="fr-grid-row fr-grid-row--right">
          <div className="fr-col-12 fr-col-md-6 fr-col-lg-4">
            <div
              className="fr-modal__body"
              style={{
                position: "fixed",
                top: 0,
                right: 0,
                bottom: 0,
                width: "100%",
                maxWidth: "40rem",
                margin: 0,
                borderRadius: 0,
                boxShadow: "-4px 0 24px rgba(0, 0, 0, 0.15)",
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
              }}>
              <div className="fr-modal__header">
                <button aria-controls={drawerId} title="Fermer" type="button" className="fr-btn--close fr-btn">
                  Fermer
                </button>
              </div>
              <div className="fr-modal__content" style={{ flex: 1, overflowY: "auto" }}>
                <h1 id={`${drawerId}-title`} className="fr-modal__title">
                  Autres motifs d&apos;archivage
                </h1>

                {/* Filtres contextuels */}
                <div className="fr-grid-row fr-grid-row--gutters fr-mb-2w">
                  <div className="fr-col-6">
                    <div className="fr-select-group fr-mb-0">
                      <select
                        className="fr-select fr-select--sm"
                        id={`${drawerId}-periode`}
                        value={periodeId}
                        onChange={(e) => setPeriodeId(e.target.value as PeriodeId)}
                        aria-label="Période">
                        {PERIODES.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="fr-col-6">
                    <div className="fr-select-group fr-mb-0">
                      <select
                        className="fr-select fr-select--sm"
                        id={`${drawerId}-departement`}
                        value={codeDepartement}
                        onChange={(e) => setCodeDepartement(e.target.value)}
                        aria-label="Département">
                        <option value="">Tous les départements</option>
                        {departements.map((d) => (
                          <option key={d.code} value={d.code}>
                            {d.code.padStart(2, "0")} {d.nom}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Nombre de résultats */}
                <p className="fr-text--sm fr-mb-3w" style={{ color: "var(--text-mention-grey)" }}>
                  {loading ? (
                    "Chargement..."
                  ) : (
                    <>
                      <strong>
                        {total} résultat{total > 1 ? "s" : ""}
                      </strong>
                    </>
                  )}
                </p>

                {/* Liste des demandes */}
                {!loading && demandes.length === 0 && (
                  <p className="fr-text--sm" style={{ color: "var(--text-mention-grey)" }}>
                    Aucune demande archivée avec un motif hors top 5 sur cette période.
                  </p>
                )}

                {!loading &&
                  demandes.map((demande) => <DemandeArchiveeCard key={demande.parcoursId} demande={demande} />)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </dialog>
  );
}
