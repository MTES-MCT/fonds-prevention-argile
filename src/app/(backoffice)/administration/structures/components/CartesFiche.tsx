import type { ReactNode } from "react";
import Link from "next/link";
import {
  codesDepartementsAmo,
  estExpertGestion,
  type AgentDeStructure,
  type ExpertAnnuaire,
  type ExpertGestion,
  type HabilitationAllersVersFiche,
  type HabilitationAmoFiche,
  type IdentiteStructure,
} from "@/features/backoffice";
import { getDepartementName, toOfficialCodeDepartement } from "@/shared/constants/departements.constants";
import { isDepartementEligible } from "@/shared/constants/rga.constants";
import { BlocFiche, Champ, ListeChamps, NonRenseigne, Rubrique } from "./BlocFiche";

interface BoutonModaleProps {
  modalId: string;
  libelle: string;
  icone: string;
  onClick: () => void;
  variante?: "primary" | "secondary" | "tertiary" | "tertiary-no-outline";
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

export type NomEpci = (code: string) => string | null;

function formaterDate(iso: string | null): string {
  if (!iso) return "Non renseignée";
  return new Date(iso).toLocaleDateString("fr-FR", { timeZone: "UTC" });
}

function EtiquettesDepartements({ codes }: { codes: string[] }) {
  if (codes.length === 0) return <NonRenseigne texte="Aucun" />;
  return (
    <ul className="fr-tags-group fr-mb-0">
      {/* Une couverture Aller-vers peut stocker « 3 » : le dispositif se lit au format officiel. */}
      {[...new Set(codes.map(toOfficialCodeDepartement))].map((code) => (
        <li key={code}>
          <p className="fr-tag fr-tag--sm fr-mb-0">
            {code} - {getDepartementName(code)}
            {!isDepartementEligible(code) && " (hors dispositif)"}
          </p>
        </li>
      ))}
    </ul>
  );
}

function ListeEpci({ codes, nomEpci }: { codes: string[]; nomEpci: NomEpci }) {
  if (codes.length === 0) return <NonRenseigne texte="Aucun" />;
  return (
    <ul className="fr-raw-list flex flex-col gap-1">
      {codes.map((code) => (
        <li key={code}>
          {nomEpci(code) ?? <NonRenseigne texte="EPCI inconnu de l'API Géo" />}
          <span className="text-sm text-(--text-mention-grey)"> · {code}</span>
        </li>
      ))}
    </ul>
  );
}

function ListeEmails({ emails }: { emails: string[] }) {
  if (emails.length === 0) return <NonRenseigne texte="Aucun" />;
  return (
    <ul className="fr-raw-list flex flex-col gap-1">
      {emails.map((email) => (
        <li key={email} className="break-all">
          {email}
        </li>
      ))}
    </ul>
  );
}

export function CarteCoordonnees({ identite, actions }: { identite: IdentiteStructure; actions: ReactNode }) {
  return (
    <BlocFiche titre="Coordonnées" icone="fr-icon-building-line" actions={actions}>
      <ListeChamps>
        <Champ libelle="SIRET">{identite.siret || <NonRenseigne />}</Champ>
        <Champ libelle="Adresse">{identite.adresse || <NonRenseigne />}</Champ>
        <Champ libelle="Téléphone">{identite.telephone || <NonRenseigne />}</Champ>
        <Champ libelle="Horaires">{identite.horaires || <NonRenseigne texte="Non renseignés" />}</Champ>
      </ListeChamps>
    </BlocFiche>
  );
}

interface CarteHabilitationProps {
  actions: ReactNode;
  // Sous la carte : pourquoi « Retirer » manque.
  mention?: ReactNode;
  nomEpci: NomEpci;
}

export function CarteAmo({ amo, actions, mention, nomEpci }: CarteHabilitationProps & { amo: HabilitationAmoFiche }) {
  const departements = codesDepartementsAmo(amo.departements);
  return (
    <BlocFiche
      titre="Habilitation AMO"
      badge={<span className="fr-badge fr-badge--sm fr-badge--no-icon fr-badge--blue-cumulus">AMO</span>}
      actions={actions}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Rubrique titre="Territoire">
          <ListeChamps>
            <Champ libelle="Départements">
              {departements.length > 0 || !amo.departements ? (
                <EtiquettesDepartements codes={departements} />
              ) : (
                amo.departements
              )}
            </Champ>
            <Champ libelle="EPCI">
              <ListeEpci codes={amo.epci} nomEpci={nomEpci} />
            </Champ>
            <Champ libelle="Communes">
              {amo.communes.length > 0 ? amo.communes.join(", ") : <NonRenseigne texte="Aucune" />}
            </Champ>
          </ListeChamps>
        </Rubrique>
        <Rubrique titre="Emails de l'équipe">
          <ListeEmails emails={amo.emails} />
        </Rubrique>
      </div>
      {mention}
    </BlocFiche>
  );
}

export function CarteAllersVers({
  allersVers,
  actions,
  mention,
  nomEpci,
}: CarteHabilitationProps & { allersVers: HabilitationAllersVersFiche }) {
  return (
    <BlocFiche
      titre="Habilitation Aller-vers"
      badge={<span className="fr-badge fr-badge--sm fr-badge--no-icon fr-badge--yellow-tournesol">Aller-vers</span>}
      actions={actions}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Rubrique titre="Territoire">
          <ListeChamps>
            <Champ libelle="Départements">
              <EtiquettesDepartements codes={allersVers.departements} />
            </Champ>
            <Champ libelle="EPCI">
              <ListeEpci codes={allersVers.epci} nomEpci={nomEpci} />
            </Champ>
          </ListeChamps>
        </Rubrique>
        <Rubrique titre="Emails de l'équipe">
          <ListeEmails emails={allersVers.emails} />
        </Rubrique>
      </div>
      {mention}
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
        <Champ libelle="Validation DHUP">{formaterDate(expert.dateValidationDhup)}</Champ>
        {gestion && (
          <Champ libelle="Contact interne">{contact.length > 0 ? contact.join(" · ") : <NonRenseigne />}</Champ>
        )}
      </ListeChamps>
      <div className="fr-table fr-table--sm fr-table--no-scroll fr-mt-3w fr-mb-0">
        <div className="fr-table__wrapper">
          <div className="fr-table__container">
            <div className="fr-table__content">
              <table>
                <caption className="fr-text--sm fr-text--bold">Départements d&apos;intervention et réservation</caption>
                <thead>
                  <tr>
                    <th scope="col">Département</th>
                    <th scope="col">Email de réservation</th>
                    <th scope="col">Téléphone de réservation</th>
                  </tr>
                </thead>
                <tbody>
                  {expert.departements.map((departement) => (
                    <tr key={departement.code}>
                      <td>
                        {departement.code} - {departement.nom}
                      </td>
                      <td className="break-all">{departement.email ?? <NonRenseigne />}</td>
                      <td>{departement.telephone ?? <NonRenseigne />}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </BlocFiche>
  );
}

interface CarteAgentsProps {
  nombreAgents: number;
  // Null pour l'administrateur, qui ne voit que leur nombre.
  agents: AgentDeStructure[] | null;
}

export function CarteAgents({ nombreAgents, agents }: CarteAgentsProps) {
  return (
    <BlocFiche
      titre="Agents"
      icone="fr-icon-team-line"
      badge={<span className="fr-badge fr-badge--sm fr-badge--no-icon fr-badge--info">{nombreAgents}</span>}>
      {agents === null ? (
        <p className="fr-mb-0">
          {nombreAgents === 0 ? "Aucun agent" : `${nombreAgents} agent${nombreAgents > 1 ? "s" : ""}`}
        </p>
      ) : agents.length === 0 ? (
        <p className="fr-mb-0">Aucun agent</p>
      ) : (
        <ul className="fr-raw-list flex flex-col gap-3">
          {agents.map((agent) => (
            <li key={agent.id}>
              <span className="font-medium">{agent.nomComplet || agent.email}</span>
              {agent.desactive && <span className="fr-badge fr-badge--sm fr-badge--no-icon fr-ml-1w">Désactivé</span>}
              {agent.nomComplet && (
                <span className="block text-sm text-(--text-mention-grey) break-all">{agent.email}</span>
              )}
            </li>
          ))}
        </ul>
      )}
      {agents && (
        <p className="fr-mt-3w fr-mb-0">
          <Link href="/administration/agents" className="fr-link fr-icon-arrow-right-line fr-link--icon-right">
            Gérer les agents
          </Link>
        </p>
      )}
    </BlocFiche>
  );
}

/** Colonne de droite d'une structure expert, qui n'a pas d'agent. */
export function CarteAnnuaireExpert({ desactive }: { desactive: boolean }) {
  return (
    <BlocFiche titre="Annuaire des experts" icone="fr-icon-book-2-line">
      <p className="fr-mb-2w">
        {desactive
          ? "Désactivé : les agents ne le voient plus dans l'annuaire."
          : "Les agents AMO et Aller-vers le trouvent dans l'annuaire des experts de leurs départements."}
      </p>
      <p className="fr-text--sm fr-mb-0 text-(--text-mention-grey)">
        Une structure expert ne reçoit pas d&apos;agent : les experts n&apos;ont pas encore de compte.
      </p>
    </BlocFiche>
  );
}
