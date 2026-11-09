import type { ReactNode } from "react";
import Link from "next/link";
import {
  estExpertGestion,
  type AgentDeStructure,
  type ExpertAnnuaire,
  type ExpertGestion,
  type HabilitationAllersVersFiche,
  type HabilitationAmoFiche,
  type IdentiteStructure,
} from "@/features/backoffice";
import type { AgentRole } from "@/shared/domain/value-objects";
import { BlocFiche, Champ, ListeChamps, NonRenseigne } from "./BlocFiche";
import DepartementsExpert from "./DepartementsExpert";
import { libelleRoleDeStructure } from "./libelles-role";

interface BoutonModaleProps {
  modalId: string;
  libelle: string;
  icone: string;
  onClick: () => void;
  variante?: "primary" | "secondary" | "tertiary";
  disabled?: boolean;
  describedBy?: string;
}

/** Ouvre une modale DSFR ; `onClick` prépare son contenu avant l'ouverture. */
export function BoutonModale({
  modalId,
  libelle,
  icone,
  onClick,
  variante = "secondary",
  disabled = false,
  describedBy,
}: BoutonModaleProps) {
  const classeVariante = variante === "primary" ? "" : ` fr-btn--${variante}`;
  return (
    <button
      type="button"
      className={`fr-btn fr-btn--sm${classeVariante} fr-btn--icon-left ${icone}`}
      aria-controls={modalId}
      data-fr-opened="false"
      aria-describedby={describedBy}
      onClick={onClick}
      disabled={disabled}>
      {libelle}
    </button>
  );
}

const liste = (valeurs: string[], vide = "Aucun") =>
  valeurs.length > 0 ? valeurs.join(", ") : <NonRenseigne texte={vide} />;

function formaterDate(iso: string | null): string {
  if (!iso) return "Non renseignée";
  return new Date(iso).toLocaleDateString("fr-FR", { timeZone: "UTC" });
}

export function CarteIdentite({ identite, actions }: { identite: IdentiteStructure; actions: ReactNode }) {
  return (
    <BlocFiche titre="Identité et contact" actions={actions}>
      <ListeChamps>
        <Champ libelle="Nom">{identite.nom}</Champ>
        <Champ libelle="SIRET">{identite.siret || <NonRenseigne />}</Champ>
        <Champ libelle="Adresse">{identite.adresse || <NonRenseigne />}</Champ>
        <Champ libelle="Téléphone">{identite.telephone || <NonRenseigne />}</Champ>
        <Champ libelle="Horaires d'ouverture">{identite.horaires || <NonRenseigne texte="Non renseignés" />}</Champ>
      </ListeChamps>
    </BlocFiche>
  );
}

export function CarteAmo({ amo, actions }: { amo: HabilitationAmoFiche; actions: ReactNode }) {
  return (
    <BlocFiche
      titre="Habilitation AMO"
      badge={<span className="fr-badge fr-badge--sm fr-badge--no-icon fr-badge--blue-cumulus">AMO</span>}
      actions={actions}>
      <ListeChamps>
        <Champ libelle="Départements">{amo.departements || <NonRenseigne />}</Champ>
        <Champ libelle="Emails de l'équipe">{liste(amo.emails)}</Champ>
        <Champ libelle="Codes EPCI">{liste(amo.epci)}</Champ>
        <Champ libelle="Codes INSEE spécifiques">{liste(amo.communes, "Aucune")}</Champ>
        <Champ libelle="Dossiers suivis">{amo.dossiersSuivis}</Champ>
      </ListeChamps>
    </BlocFiche>
  );
}

export function CarteAllersVers({
  allersVers,
  actions,
}: {
  allersVers: HabilitationAllersVersFiche;
  actions: ReactNode;
}) {
  return (
    <BlocFiche
      titre="Habilitation Aller-vers"
      badge={<span className="fr-badge fr-badge--sm fr-badge--no-icon fr-badge--yellow-tournesol">Aller-vers</span>}
      actions={actions}>
      <ListeChamps>
        <Champ libelle="Emails de l'équipe">{liste(allersVers.emails)}</Champ>
        <Champ libelle="Départements">{liste(allersVers.departements)}</Champ>
        <Champ libelle="Codes EPCI">{liste(allersVers.epci)}</Champ>
      </ListeChamps>
    </BlocFiche>
  );
}

export function CarteExpert({ expert, actions }: { expert: ExpertGestion | ExpertAnnuaire; actions?: ReactNode }) {
  const gestion = estExpertGestion(expert) ? expert : null;
  const desactivation = gestion?.desactivation ?? null;
  const contact = gestion
    ? [gestion.contactInterne.nom, gestion.contactInterne.email, gestion.contactInterne.telephone].filter(Boolean)
    : [];

  return (
    <BlocFiche
      titre="Habilitation Expert"
      badge={
        <>
          <span className="fr-badge fr-badge--sm fr-badge--no-icon fr-badge--green-emeraude">Expert</span>
          {desactivation && <span className="fr-badge fr-badge--sm fr-badge--no-icon">Désactivé</span>}
        </>
      }
      actions={actions}>
      {desactivation && (
        <div className="fr-alert fr-alert--warning fr-alert--sm fr-mb-2w">
          <p>
            Désactivé le {formaterDate(desactivation.le)}
            {desactivation.par && ` par ${desactivation.par}`}
            {desactivation.raison && ` : ${desactivation.raison}`}. Il n&apos;apparaît plus dans l&apos;annuaire des
            agents.
          </p>
        </div>
      )}
      <ListeChamps>
        <Champ libelle="Date de validation DHUP">{formaterDate(expert.dateValidationDhup)}</Champ>
        {gestion && (
          <Champ libelle="Contact interne">{contact.length > 0 ? contact.join(" · ") : <NonRenseigne />}</Champ>
        )}
      </ListeChamps>
      <p className="text-sm text-(--text-mention-grey) fr-mt-2w fr-mb-1v">Départements d&apos;intervention</p>
      <DepartementsExpert departements={expert.departements} />
    </BlocFiche>
  );
}

interface CarteAgentsProps {
  nombreAgents: number;
  // Null pour l'administrateur, qui ne voit que leur nombre.
  agents: AgentDeStructure[] | null;
  role: AgentRole | null;
}

export function CarteAgents({ nombreAgents, agents, role }: CarteAgentsProps) {
  return (
    <BlocFiche
      titre="Agents"
      actions={
        agents ? (
          <Link href="/administration/agents" className="fr-link fr-icon-arrow-right-line fr-link--icon-right">
            Gérer les agents
          </Link>
        ) : undefined
      }>
      <p className="fr-mb-2w">
        {role ? (
          <>
            Rôle donné à ses agents : <strong>{libelleRoleDeStructure(role)}</strong>
          </>
        ) : (
          "Ni AMO ni Aller-vers : la structure ne donne aucun rôle à ses agents."
        )}
      </p>
      {agents === null ? (
        <p className="fr-mb-0">
          {nombreAgents === 0 ? "Aucun agent" : `${nombreAgents} agent${nombreAgents > 1 ? "s" : ""}`}
        </p>
      ) : agents.length === 0 ? (
        <p className="fr-mb-0">Aucun agent</p>
      ) : (
        <ul className="fr-mb-0">
          {agents.map((agent) => (
            <li key={agent.id}>
              {agent.nomComplet || agent.email}
              {agent.nomComplet && <span className="text-(--text-mention-grey)"> · {agent.email}</span>}
              {agent.desactive && <span className="fr-badge fr-badge--sm fr-badge--no-icon fr-ml-1w">Désactivé</span>}
            </li>
          ))}
        </ul>
      )}
    </BlocFiche>
  );
}
