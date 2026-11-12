"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ajouterHabilitationAction,
  codesDepartementsAmo,
  desactiverExpertAction,
  estExpertGestion,
  getFicheStructureAction,
  HABILITATIONS_PAR_TYPE,
  habilitationsDeFiche,
  LIBELLES_HABILITATION,
  modifierHabilitationAction,
  modifierIdentiteAction,
  reactiverExpertAction,
  refusAjout,
  retirerHabilitationAction,
  supprimerStructureAction,
  TYPES_HABILITATION,
  type FicheStructure,
  type TypeHabilitation,
  type TypeStructure,
} from "@/features/backoffice";
import { toOfficialCodeDepartement } from "@/shared/constants/departements.constants";
import { roleDepuisStructure } from "@/shared/domain/value-objects";
import { UserRole, type AdminRole } from "@/shared/domain/value-objects/user-role.enum";
import type { ActionResult } from "@/shared/types";
import { ActionMenu } from "../../../espace-agent/shared/components/ActionMenu";
import { AdminBreadcrumb } from "../../shared/components/AdminBreadcrumb";
import BadgesHabilitations from "./BadgesHabilitations";
import { Chiffre } from "./BlocFiche";
import {
  BoutonModale,
  CarteAgents,
  CarteAllersVers,
  CarteAmo,
  CarteAnnuaireExpert,
  CarteCoordonnees,
  CarteExpert,
} from "./CartesFiche";
import EffetSurAgents from "./EffetSurAgents";
import ExpertDesactiverModal from "./ExpertDesactiverModal";
import ExpertFormModal from "./ExpertFormModal";
import HabilitationAllersVersModal from "./HabilitationAllersVersModal";
import HabilitationAmoModal from "./HabilitationAmoModal";
import IdentiteStructureModal from "./IdentiteStructureModal";
import { libelleRoleDeStructure } from "./libelles-role";
import { ouvrirModale } from "./modales-dsfr";
import RetraitHabilitationModal from "./RetraitHabilitationModal";
import SuppressionStructureModal from "./SuppressionStructureModal";
import type { SaisieAllersVers } from "./formulaires/ChampsAllersVers";
import type { SaisieAmo } from "./formulaires/ChampsAmo";
import { versSaisieExpert, type ExpertFormulaire } from "./formulaires/ChampsExpert";
import type { IdentiteFormulaire } from "./formulaires/ChampsIdentite";
import { useNomsEpci, useReferentielEpci } from "./formulaires/useReferentielEpci";

const LISTE = "/administration/structures";

const MODALES = {
  identite: "modal-identite-structure",
  amo: "modal-habilitation-amo",
  allersVers: "modal-habilitation-allers-vers",
  expert: "modal-habilitation-expert",
  desactiverExpert: "modal-desactiver-expert",
  retrait: "modal-retrait-habilitation",
  suppression: "modal-supprimer-structure",
} as const;

const MODALE_AJOUT: Record<TypeHabilitation, string> = {
  amo: MODALES.amo,
  allersVers: MODALES.allersVers,
  expert: MODALES.expert,
};

type Mode = "ajout" | "modification";

const BADGE_TYPE: Record<TypeStructure, string> = {
  accompagnement: "Structure d'accompagnement",
  expert: "Structure expert",
};
type Annonce = { type: "succes" | "erreur"; texte: string };

interface FicheStructurePanelProps {
  structureId: string;
  role: AdminRole;
}

export default function FicheStructurePanel({ structureId, role }: FicheStructurePanelProps) {
  const router = useRouter();
  const estSuperAdmin = role === UserRole.SUPER_ADMINISTRATEUR;
  const [fiche, setFiche] = useState<FicheStructure | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [erreurChargement, setErreurChargement] = useState<string | null>(null);
  const [annonce, setAnnonce] = useState<Annonce | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Affichée dans la modale encore ouverte : derrière elle, le message ne se verrait pas.
  const [erreurOperation, setErreurOperation] = useState<string | null>(null);
  const [versionOuverture, setVersionOuverture] = useState(0);
  const [modeAmo, setModeAmo] = useState<Mode>("ajout");
  const [modeAllersVers, setModeAllersVers] = useState<Mode>("ajout");
  const [modeExpert, setModeExpert] = useState<Mode>("ajout");
  const [typeRetrait, setTypeRetrait] = useState<"amo" | "allersVers" | null>(null);

  const charger = useCallback(async (): Promise<boolean> => {
    const result = await getFicheStructureAction(structureId);
    if (!result.success) {
      setErreurChargement(result.error || "Erreur lors du chargement de la structure");
      return false;
    }
    setFiche(result.data);
    setErreurChargement(null);
    return true;
  }, [structureId]);

  useEffect(() => {
    charger().finally(() => setIsLoading(false));
  }, [charger]);

  const preparer = () => {
    setErreurOperation(null);
    setAnnonce(null);
    setVersionOuverture((version) => version + 1);
  };

  // Recharge après chaque opération ; une structure disparue entre-temps renvoie à la liste.
  const executer = async (
    operation: () => Promise<ActionResult<void>>,
    succes: string,
    dansUneModale = true
  ): Promise<boolean> => {
    setIsSubmitting(true);
    setErreurOperation(null);
    setAnnonce(null);
    try {
      const result = await operation();
      if (!result.success) {
        const message = result.error || "L'opération a échoué";
        if (dansUneModale) setErreurOperation(message);
        else setAnnonce({ type: "erreur", texte: message });
        return false;
      }
      setAnnonce({ type: "succes", texte: succes });
      if (!(await charger())) router.push(LISTE);
      return true;
    } finally {
      setIsSubmitting(false);
    }
  };

  const enregistrerHabilitation = (
    type: TypeHabilitation,
    mode: Mode,
    action: () => Promise<ActionResult<void>>
  ): Promise<boolean> =>
    executer(action, `Habilitation ${LIBELLES_HABILITATION[type]} ${mode === "ajout" ? "ajoutée" : "enregistrée"}.`);

  const handleIdentite = (formulaire: IdentiteFormulaire) =>
    executer(() => modifierIdentiteAction({ structureId, identite: formulaire }), "Identité enregistrée.");

  const handleAmo = (saisie: SaisieAmo) =>
    enregistrerHabilitation("amo", modeAmo, () =>
      (modeAmo === "ajout" ? ajouterHabilitationAction : modifierHabilitationAction)({
        habilitation: "amo",
        structureId,
        saisie,
      })
    );

  const handleAllersVers = (saisie: SaisieAllersVers) =>
    enregistrerHabilitation("allersVers", modeAllersVers, () =>
      (modeAllersVers === "ajout" ? ajouterHabilitationAction : modifierHabilitationAction)({
        habilitation: "allersVers",
        structureId,
        saisie,
      })
    );

  const handleExpert = (formulaire: ExpertFormulaire) =>
    enregistrerHabilitation("expert", modeExpert, () =>
      (modeExpert === "ajout" ? ajouterHabilitationAction : modifierHabilitationAction)({
        habilitation: "expert",
        structureId,
        saisie: versSaisieExpert(formulaire),
      })
    );

  const expertGere = fiche?.expert && estExpertGestion(fiche.expert) ? fiche.expert : null;

  const handleDesactiver = (raison: string) =>
    executer(() => desactiverExpertAction({ id: expertGere?.id, raison }), "L'habilitation Expert est désactivée.");

  // Sans modale : un refus s'affiche en tête de fiche.
  const handleReactiver = () =>
    executer(() => reactiverExpertAction({ id: expertGere?.id }), "L'habilitation Expert est réactivée.", false);

  const handleRetrait = (type: "amo" | "allersVers") =>
    executer(
      () => retirerHabilitationAction({ structureId, habilitation: type }),
      `Habilitation ${LIBELLES_HABILITATION[type]} retirée.`
    );

  const handleSupprimer = async (): Promise<boolean> => {
    setIsSubmitting(true);
    setErreurOperation(null);
    try {
      const result = await supprimerStructureAction(structureId);
      if (!result.success) {
        setErreurOperation(result.error || "La suppression a échoué");
        return false;
      }
      router.push(LISTE);
      return true;
    } finally {
      setIsSubmitting(false);
    }
  };

  const { epcis } = useReferentielEpci();
  const nomEpci = useNomsEpci(epcis);

  const habilitations = fiche ? habilitationsDeFiche(fiche) : { amo: false, allersVers: false, expert: false };
  // Ajouter ou retirer AMO et Aller-vers change les rôles des agents : réservé au super-administrateur s'il y en a.
  const peutChangerRoles = !!fiche && (estSuperAdmin || fiche.nombreAgents === 0);
  const sansSiret = !fiche?.identite.siret;

  const habilitationsPresentes = TYPES_HABILITATION.filter((type) => habilitations[type]);
  const derniereHabilitation = habilitationsPresentes.length === 1;
  const rolesReserves = !!fiche && fiche.type === "accompagnement" && !peutChangerRoles;
  // Une structure expert ne se supprime, avec son habilitation, que par le super-administrateur.
  const suppressionPossible = !!fiche?.suppressionPossible && (fiche.type !== "expert" || estSuperAdmin);
  const roleAgents = roleDepuisStructure(habilitations);

  const ajouts = fiche
    ? HABILITATIONS_PAR_TYPE[fiche.type]
        .filter((type) => !refusAjout(fiche.type, habilitations, type))
        .filter((type) => (type === "expert" ? estSuperAdmin : peutChangerRoles))
    : [];

  const departementsCouverts = fiche
    ? new Set([
        ...codesDepartementsAmo(fiche.amo?.departements),
        ...(fiche.allersVers?.departements.map(toOfficialCodeDepartement) ?? []),
        ...(fiche.expert?.departements.map((departement) => departement.code) ?? []),
      ]).size
    : 0;

  const ouvrirAjout = (type: TypeHabilitation) => {
    preparer();
    if (type === "amo") setModeAmo("ajout");
    else if (type === "allersVers") setModeAllersVers("ajout");
    else setModeExpert("ajout");
    ouvrirModale(MODALE_AJOUT[type]);
  };

  // Actions sur la structure entière ; chaque carte porte les siennes.
  const elementsMenu = fiche
    ? [
        ...ajouts.map((type) => {
          // AMO et expert recopient le SIRET de la structure sur leur ligne.
          const bloque = type !== "allersVers" && sansSiret;
          return {
            label: `Ajouter l'habilitation ${LIBELLES_HABILITATION[type]}${bloque ? " (renseignez d'abord le SIRET)" : ""}`,
            icon: "fr-icon-add-line",
            disabled: bloque,
            onClick: () => ouvrirAjout(type),
          };
        }),
        ...(suppressionPossible
          ? [
              {
                label: "Supprimer la structure",
                icon: "fr-icon-delete-line",
                variant: "danger" as const,
                onClick: () => {
                  preparer();
                  ouvrirModale(MODALES.suppression);
                },
              },
            ]
          : []),
      ]
    : [];

  const effetAjout = (type: "amo" | "allersVers", mode: Mode) =>
    fiche && mode === "ajout" ? (
      <EffetSurAgents
        habilitations={habilitations}
        type={type}
        operation="ajout"
        nombreAgents={fiche.nombreAgents}
        agents={fiche.agents}
      />
    ) : null;

  const boutonRetrait = (type: "amo" | "allersVers") =>
    peutChangerRoles && !derniereHabilitation ? (
      <BoutonModale
        modalId={MODALES.retrait}
        libelle="Retirer"
        icone="fr-icon-delete-line"
        variante="tertiary"
        onClick={() => {
          preparer();
          setTypeRetrait(type);
        }}
      />
    ) : null;

  const mentionDerniere =
    peutChangerRoles && derniereHabilitation ? (
      <p className="fr-hint-text fr-mt-2w fr-mb-0">Dernière habilitation : pour la retirer, supprimez la structure</p>
    ) : null;

  const boutonModifier = (modalId: string, onClick: () => void) => (
    <BoutonModale modalId={modalId} libelle="Modifier" icone="fr-icon-edit-line" onClick={onClick} />
  );

  return (
    <>
      <div className="fr-container fr-pt-4w">
        <AdminBreadcrumb
          currentPageLabel={fiche?.identite.nom ?? "Fiche structure"}
          parents={[{ label: "Structures", href: LISTE }]}
        />
        <div className="fr-grid-row fr-grid-row--middle fr-grid-row--gutters fr-mb-2w">
          <div className="fr-col">
            <h1 className="fr-h2 fr-mb-2w">{fiche?.identite.nom ?? "Structure"}</h1>
            {fiche && (
              <div className="flex flex-wrap gap-2 items-start">
                <span className="fr-badge fr-badge--sm fr-badge--no-icon">{BADGE_TYPE[fiche.type]}</span>
                <BadgesHabilitations habilitations={habilitations} expertDesactive={!!expertGere?.desactivation} />
              </div>
            )}
          </div>
          {elementsMenu.length > 0 && (
            <div className="fr-col-auto">
              <ActionMenu
                ariaLabel="Gérer la structure"
                triggerLabel="Gérer"
                triggerClassName="fr-btn fr-btn--secondary fr-btn--sm fr-icon-arrow-down-s-line fr-btn--icon-right"
                items={elementsMenu}
              />
            </div>
          )}
        </div>

        {annonce && (
          <div
            className={`fr-alert fr-alert--sm fr-mb-2w ${annonce.type === "succes" ? "fr-alert--success" : "fr-alert--error"}`}>
            <p>{annonce.texte}</p>
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <div className="text-(--text-mention-grey)">Chargement de la structure...</div>
          </div>
        ) : !fiche ? (
          <div className="fr-alert fr-alert--error fr-mb-4w">
            <p>{erreurChargement}</p>
            <p>
              <Link href={LISTE} className="fr-link">
                Retour à la liste des structures
              </Link>
            </p>
          </div>
        ) : (
          <div className="fr-grid-row fr-grid-row--gutters fr-mb-4w">
            <div className="fr-col-12 fr-col-md-8">
              <div className="fr-callout fr-mb-3w">
                {fiche.type === "expert" ? (
                  <>
                    <h2 className="fr-callout__title fr-h6">L&apos;expertise ne donne aucun rôle</h2>
                    <p className="fr-callout__text fr-text--md">
                      Une structure expert ne porte que l&apos;expertise : elle ne peut recevoir ni AMO, ni Aller-vers,
                      ni agent.
                    </p>
                  </>
                ) : (
                  <>
                    <h2 className="fr-callout__title fr-h6">
                      {roleAgents
                        ? `Ses agents ont le rôle ${libelleRoleDeStructure(roleAgents)}`
                        : "Ses habilitations ne donnent aucun rôle"}
                    </h2>
                    <p className="fr-callout__text fr-text--md">
                      Ce rôle vient de ses habilitations : en ajouter ou en retirer une le change dès la requête
                      suivante de chacun de ses agents.
                    </p>
                    {rolesReserves && (
                      <p className="fr-callout__text fr-text--sm fr-mt-1w">
                        Cette structure a des agents : seul un super-administrateur peut lui ajouter ou retirer
                        l&apos;habilitation AMO ou Aller-vers.
                      </p>
                    )}
                  </>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {fiche.type === "accompagnement" && (
                  <Chiffre valeur={fiche.nombreAgents} libelle={fiche.nombreAgents > 1 ? "agents" : "agent"} />
                )}
                {fiche.amo && (
                  <Chiffre
                    valeur={fiche.amo.dossiersSuivis}
                    libelle={fiche.amo.dossiersSuivis > 1 ? "dossiers suivis en AMO" : "dossier suivi en AMO"}
                  />
                )}
                {fiche.type === "accompagnement" ? (
                  <Chiffre
                    valeur={departementsCouverts}
                    libelle={departementsCouverts > 1 ? "départements couverts" : "département couvert"}
                  />
                ) : (
                  <>
                    <Chiffre
                      valeur={departementsCouverts}
                      libelle={departementsCouverts > 1 ? "départements d'intervention" : "département d'intervention"}
                    />
                    <Chiffre
                      valeur={
                        fiche.expert?.dateValidationDhup
                          ? new Date(fiche.expert.dateValidationDhup).toLocaleDateString("fr-FR", { timeZone: "UTC" })
                          : "Non renseignée"
                      }
                      libelle="validation par la DHUP"
                    />
                  </>
                )}
              </div>
            </div>
            <div className="fr-col-12 fr-col-md-4">
              <CarteCoordonnees identite={fiche.identite} actions={boutonModifier(MODALES.identite, preparer)} />
            </div>
          </div>
        )}
      </div>

      {fiche && (
        <section className="fr-background-alt--blue-france fr-py-4w">
          <div className="fr-container">
            <div className="fr-grid-row fr-grid-row--gutters">
              <div className="fr-col-12 fr-col-md-8 flex flex-col gap-6">
                {fiche.type === "accompagnement" && fiche.amo && (
                  <CarteAmo
                    amo={fiche.amo}
                    nomEpci={nomEpci}
                    mention={mentionDerniere}
                    actions={
                      <>
                        {boutonModifier(MODALES.amo, () => {
                          preparer();
                          setModeAmo("modification");
                        })}
                        {boutonRetrait("amo")}
                      </>
                    }
                  />
                )}

                {fiche.type === "accompagnement" && fiche.allersVers && (
                  <CarteAllersVers
                    allersVers={fiche.allersVers}
                    nomEpci={nomEpci}
                    mention={mentionDerniere}
                    actions={
                      <>
                        {boutonModifier(MODALES.allersVers, () => {
                          preparer();
                          setModeAllersVers("modification");
                        })}
                        {boutonRetrait("allersVers")}
                      </>
                    }
                  />
                )}

                {fiche.type === "expert" && fiche.expert && (
                  <CarteExpert
                    expert={fiche.expert}
                    actions={
                      expertGere && (
                        <>
                          {boutonModifier(MODALES.expert, () => {
                            preparer();
                            setModeExpert("modification");
                          })}
                          {expertGere.desactivation ? (
                            <button
                              type="button"
                              className="fr-btn fr-btn--sm fr-btn--tertiary fr-btn--icon-left fr-icon-refresh-line"
                              onClick={handleReactiver}
                              disabled={isSubmitting}>
                              Réactiver
                            </button>
                          ) : (
                            <BoutonModale
                              modalId={MODALES.desactiverExpert}
                              libelle="Désactiver"
                              icone="fr-icon-close-circle-line"
                              variante="tertiary"
                              onClick={preparer}
                            />
                          )}
                        </>
                      )
                    }
                  />
                )}
              </div>

              <div className="fr-col-12 fr-col-md-4">
                {/* Une structure expert ne reçoit pas d'agent : les experts n'ont pas encore de compte. */}
                {fiche.type === "accompagnement" || fiche.nombreAgents > 0 ? (
                  <CarteAgents nombreAgents={fiche.nombreAgents} agents={fiche.agents} />
                ) : (
                  <CarteAnnuaireExpert desactive={!!expertGere?.desactivation} />
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      <IdentiteStructureModal
        modalId={MODALES.identite}
        identite={fiche?.identite ?? null}
        siretRequis={fiche?.siretObligatoire ?? false}
        versionOuverture={versionOuverture}
        onConfirm={handleIdentite}
        erreur={erreurOperation}
        isLoading={isSubmitting}
      />
      <HabilitationAmoModal
        modalId={MODALES.amo}
        amo={modeAmo === "modification" ? (fiche?.amo ?? null) : null}
        versionOuverture={versionOuverture}
        effetSurAgents={effetAjout("amo", modeAmo)}
        onConfirm={handleAmo}
        erreur={erreurOperation}
        isLoading={isSubmitting}
      />
      <HabilitationAllersVersModal
        modalId={MODALES.allersVers}
        allersVers={modeAllersVers === "modification" ? (fiche?.allersVers ?? null) : null}
        versionOuverture={versionOuverture}
        effetSurAgents={effetAjout("allersVers", modeAllersVers)}
        onConfirm={handleAllersVers}
        erreur={erreurOperation}
        isLoading={isSubmitting}
      />
      <ExpertFormModal
        modalId={MODALES.expert}
        expert={modeExpert === "modification" ? expertGere : null}
        versionOuverture={versionOuverture}
        onConfirm={handleExpert}
        erreur={erreurOperation}
        isLoading={isSubmitting}
      />
      <ExpertDesactiverModal
        modalId={MODALES.desactiverExpert}
        expert={expertGere}
        onConfirm={handleDesactiver}
        erreur={erreurOperation}
        isLoading={isSubmitting}
      />
      <RetraitHabilitationModal
        modalId={MODALES.retrait}
        fiche={fiche}
        type={typeRetrait}
        onConfirm={handleRetrait}
        erreur={erreurOperation}
        isLoading={isSubmitting}
      />
      <SuppressionStructureModal
        modalId={MODALES.suppression}
        nom={fiche?.identite.nom ?? null}
        habilitations={habilitationsPresentes}
        onConfirm={handleSupprimer}
        erreur={erreurOperation}
        isLoading={isSubmitting}
      />
    </>
  );
}
