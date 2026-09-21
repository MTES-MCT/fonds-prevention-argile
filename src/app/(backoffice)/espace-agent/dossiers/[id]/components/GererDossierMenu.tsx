"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ROUTES } from "@/features/auth/domain/value-objects";
import { ArchiveModal } from "../../../shared/components/ArchiveModal";
import { UnarchiveModal } from "../../../shared/components/UnarchiveModal";
import { RattacherAmoModal } from "../../../shared/components/RattacherAmoModal";
import { ArretAccompagnementModal } from "../../../shared/components/ArretAccompagnementModal";
import { RattacherDossierDnModal } from "../../../shared/components/RattacherDossierDnModal";
import { ReinitialiserDossierDnModal } from "../../../shared/components/ReinitialiserDossierDnModal";
import { LIBELLE_FORMULAIRE } from "@/features/parcours/dossiers-ds/domain/value-objects/libelle-formulaire";
import { ActionMenu } from "../../../shared/components";
import type { Step } from "@/shared/domain/value-objects/step.enum";

interface GererDossierMenuProps {
  parcoursId: string;
  demandeurNom: string;
  /** L'entrée « Ne plus accompagner » n'a de sens que pour l'AMO responsable du dossier. */
  peutArreterAccompagnement: boolean;
  /** Les actions sur le dossier DN sont réservées aux AMO, Allers-vers et super-admins. */
  peutAgirSurDossierDn: boolean;
  /** Réinitialiser n'a de sens que sur un formulaire jamais transmis. */
  peutReinitialiserDn: boolean;
  /** Étape dont le formulaire serait réinitialisé. */
  stepCourante: Step;
  /** Ouvre la modale d'arrêt au montage (entrée depuis le bandeau « Je donne ma réponse »). */
  ouvrirArretAuMontage?: boolean;
  /** Dossier archivé : « Archiver » laisse place à « Désarchiver ». */
  estArchive: boolean;
  /** Dossier sans AMO en département obligatoire, réparable par un super-admin (ADR-0037). */
  rattachementAmo: { amoNom: string; origine: "audit" | "territoire" } | null;
}

/**
 * Menu « Gérer » du détail dossier : (dés)archivage, actions sur le dossier DN, Ne plus accompagner.
 */
export function GererDossierMenu({
  parcoursId,
  demandeurNom,
  peutArreterAccompagnement,
  peutAgirSurDossierDn,
  peutReinitialiserDn,
  stepCourante,
  ouvrirArretAuMontage = false,
  estArchive,
  rattachementAmo,
}: GererDossierMenuProps) {
  const router = useRouter();
  const [isArchiveOpen, setIsArchiveOpen] = useState(false);
  const [isUnarchiveOpen, setIsUnarchiveOpen] = useState(false);
  const [isRattacherAmoOpen, setIsRattacherAmoOpen] = useState(false);
  const [isArretOpen, setIsArretOpen] = useState(ouvrirArretAuMontage);
  const [isRattacherOpen, setIsRattacherOpen] = useState(false);
  const [isReinitOpen, setIsReinitOpen] = useState(false);

  // Après archivage comme après arrêt, l'agent n'a plus le dossier dans son périmètre.
  function backToListing() {
    setIsArchiveOpen(false);
    setIsArretOpen(false);
    router.push(ROUTES.backoffice.espaceAmo.dossiers);
  }

  return (
    <>
      <ActionMenu
        ariaLabel="Gérer le dossier"
        triggerLabel="Gérer"
        triggerClassName="fr-btn fr-btn--secondary fr-btn--sm fr-icon-arrow-down-s-line fr-btn--icon-right"
        items={[
          estArchive
            ? {
                label: "Désarchiver",
                icon: "fr-icon-inbox-archive-line",
                onClick: () => setIsUnarchiveOpen(true),
              }
            : { label: "Archiver", icon: "fr-icon-archive-line", onClick: () => setIsArchiveOpen(true) },
          // Proposée uniquement aux rôles habilités : l'action refuserait les autres.
          ...(peutAgirSurDossierDn
            ? [
                {
                  label: "Rattacher un dossier DN",
                  icon: "fr-icon-links-line",
                  onClick: () => setIsRattacherOpen(true),
                },
              ]
            : []),
          ...(peutAgirSurDossierDn && peutReinitialiserDn
            ? [
                {
                  label: `Réinitialiser le formulaire ${LIBELLE_FORMULAIRE[stepCourante] ?? "DN"}`,
                  icon: "fr-icon-refresh-line",
                  onClick: () => setIsReinitOpen(true),
                },
              ]
            : []),
          ...(rattachementAmo
            ? [
                {
                  label: "Rattacher une AMO",
                  icon: "fr-icon-links-line",
                  onClick: () => setIsRattacherAmoOpen(true),
                },
              ]
            : []),
          ...(peutArreterAccompagnement
            ? [
                {
                  label: "Ne plus accompagner",
                  icon: "fr-icon-close-circle-line",
                  variant: "danger" as const,
                  onClick: () => setIsArretOpen(true),
                },
              ]
            : []),
        ]}
      />

      <ArchiveModal
        isOpen={isArchiveOpen}
        onClose={() => setIsArchiveOpen(false)}
        parcoursId={parcoursId}
        onSuccess={backToListing}
      />

      {rattachementAmo && (
        <RattacherAmoModal
          isOpen={isRattacherAmoOpen}
          onClose={() => setIsRattacherAmoOpen(false)}
          parcoursId={parcoursId}
          amoNom={rattachementAmo.amoNom}
          origine={rattachementAmo.origine}
          onSuccess={() => {
            setIsRattacherAmoOpen(false);
            router.refresh();
          }}
        />
      )}

      {/* Le dé-archivage ramène le dossier dans le périmètre de l'agent : on reste sur la page. */}
      <UnarchiveModal
        isOpen={isUnarchiveOpen}
        onClose={() => setIsUnarchiveOpen(false)}
        parcoursId={parcoursId}
        onSuccess={() => {
          setIsUnarchiveOpen(false);
          router.refresh();
        }}
      />

      <ReinitialiserDossierDnModal
        isOpen={isReinitOpen}
        onClose={() => setIsReinitOpen(false)}
        parcoursId={parcoursId}
        step={stepCourante}
        onSuccess={() => router.refresh()}
      />

      <RattacherDossierDnModal
        isOpen={isRattacherOpen}
        onClose={() => setIsRattacherOpen(false)}
        parcoursId={parcoursId}
        onSuccess={() => {
          setIsRattacherOpen(false);
          router.refresh();
        }}
      />

      <ArretAccompagnementModal
        isOpen={isArretOpen}
        onClose={() => setIsArretOpen(false)}
        parcoursId={parcoursId}
        demandeurNom={demandeurNom}
        onArretSuccess={backToListing}
        onPoursuiteSuccess={() => {
          setIsArretOpen(false);
          router.refresh();
        }}
      />
    </>
  );
}
