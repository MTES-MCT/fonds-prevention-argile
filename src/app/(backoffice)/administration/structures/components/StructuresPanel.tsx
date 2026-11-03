"use client";

import { useCallback, useEffect, useState } from "react";
import {
  detacherHabilitationAction,
  fusionnerStructuresAction,
  getStructuresAction,
  LIBELLES_HABILITATION,
  renommerStructureAction,
  type StructureAdministration,
  type TypeHabilitation,
} from "@/features/backoffice";
import type { ActionResult } from "@/shared/types";
import { AdminBreadcrumb } from "../../shared/components/AdminBreadcrumb";
import StructuresList from "./StructuresList";
import StructureRenommerModal from "./StructureRenommerModal";
import StructureFusionModal from "./StructureFusionModal";
import StructureDetacherModal from "./StructureDetacherModal";

const MODAL_RENOMMER_ID = "modal-renommer-structure";
const MODAL_FUSION_ID = "modal-fusion-structure";
const MODAL_DETACHER_ID = "modal-detacher-structure";

export default function StructuresPanel() {
  const [structures, setStructures] = useState<StructureAdministration[]>([]);
  const [selection, setSelection] = useState<StructureAdministration | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Affichée dans la modale encore ouverte : derrière elle, le message ne se verrait pas.
  const [erreurOperation, setErreurOperation] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    const result = await getStructuresAction();
    if (result.success) {
      setStructures(result.data);
    } else {
      setError(result.error || "Erreur lors du chargement des structures");
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const selectionner = (structure: StructureAdministration) => {
    setSelection(structure);
    setErreurOperation(null);
    setNotice(null);
  };

  // Recharge après chaque opération : une fusion fait disparaître une ligne, un détachement en crée une.
  const executer = async (operation: () => Promise<ActionResult<void>>, succes: string): Promise<boolean> => {
    setIsSubmitting(true);
    setErreurOperation(null);
    setNotice(null);
    try {
      const result = await operation();
      if (!result.success) {
        setErreurOperation(result.error || "L'opération a échoué");
        return false;
      }
      setNotice(succes);
      await loadData();
      return true;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRenommer = (nom: string) =>
    executer(
      () => renommerStructureAction({ structureId: selection?.id, nom }),
      `Structure renommée en « ${nom.trim()} ».`
    );

  const handleFusionner = (source: StructureAdministration) =>
    executer(
      () => fusionnerStructuresAction({ cibleId: selection?.id, sourceId: source.id }),
      `« ${source.nom} » a rejoint « ${selection?.nom} ».`
    );

  const handleDetacher = (habilitation: TypeHabilitation) =>
    executer(
      () => detacherHabilitationAction({ structureId: selection?.id, habilitation }),
      `L'habilitation ${LIBELLES_HABILITATION[habilitation]} est détachée dans une nouvelle structure.`
    );

  return (
    <>
      <section className="fr-container-fluid fr-pt-4w" style={{ borderBottom: "1px solid var(--border-default-grey)" }}>
        <div className="fr-container">
          <AdminBreadcrumb currentPageLabel="Structures" />
          <div className="fr-mb-4w">
            <h1 className="fr-h2 fr-mb-1v">Structures</h1>
            <p style={{ color: "var(--text-mention-grey)", marginBottom: 0 }}>
              Une structure donne ses rôles à ses agents : sa ligne AMO le rôle AMO, sa ligne Aller-vers le rôle
              Aller-vers, les deux le rôle cumulé.
            </p>
          </div>

          {error && (
            <div className="fr-alert fr-alert--error fr-mb-2w">
              <p>{error}</p>
            </div>
          )}

          {notice && (
            <div className="fr-alert fr-alert--success fr-mb-2w">
              <p>{notice}</p>
            </div>
          )}
        </div>
      </section>

      <section className="fr-container-fluid fr-py-4w bg-(--background-alt-blue-france)">
        <div className="fr-container">
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <div className="text-(--text-mention-grey)">Chargement des structures...</div>
            </div>
          ) : (
            <StructuresList
              structures={structures}
              onRenommer={selectionner}
              onFusionner={selectionner}
              onDetacher={selectionner}
              isLoading={isSubmitting}
              modalRenommerId={MODAL_RENOMMER_ID}
              modalFusionId={MODAL_FUSION_ID}
              modalDetacherId={MODAL_DETACHER_ID}
            />
          )}
        </div>
      </section>

      <StructureRenommerModal
        modalId={MODAL_RENOMMER_ID}
        structure={selection}
        onConfirm={handleRenommer}
        erreur={erreurOperation}
        isLoading={isSubmitting}
      />
      <StructureFusionModal
        modalId={MODAL_FUSION_ID}
        cible={selection}
        structures={structures}
        onConfirm={handleFusionner}
        erreur={erreurOperation}
        isLoading={isSubmitting}
      />
      <StructureDetacherModal
        modalId={MODAL_DETACHER_ID}
        structure={selection}
        onConfirm={handleDetacher}
        erreur={erreurOperation}
        isLoading={isSubmitting}
      />
    </>
  );
}
