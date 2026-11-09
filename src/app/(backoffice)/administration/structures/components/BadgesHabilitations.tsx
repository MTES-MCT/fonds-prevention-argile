import type { HabilitationsAdministrables } from "@/features/backoffice";

interface BadgesHabilitationsProps {
  habilitations: HabilitationsAdministrables;
  expertDesactive?: boolean;
}

export default function BadgesHabilitations({ habilitations, expertDesactive = false }: BadgesHabilitationsProps) {
  if (!habilitations.amo && !habilitations.allersVers && !habilitations.expert) {
    return <span className="text-sm text-(--text-mention-grey)">Aucune habilitation</span>;
  }

  return (
    <ul className="fr-badges-group">
      {habilitations.amo && (
        <li>
          <span className="fr-badge fr-badge--sm fr-badge--no-icon fr-badge--blue-cumulus">AMO</span>
        </li>
      )}
      {habilitations.allersVers && (
        <li>
          <span className="fr-badge fr-badge--sm fr-badge--no-icon fr-badge--yellow-tournesol">Aller-vers</span>
        </li>
      )}
      {habilitations.expert && (
        <li>
          <span className="fr-badge fr-badge--sm fr-badge--no-icon fr-badge--green-emeraude">Expert</span>
        </li>
      )}
      {habilitations.expert && expertDesactive && (
        <li>
          <span className="fr-badge fr-badge--sm fr-badge--no-icon">Expert désactivé</span>
        </li>
      )}
    </ul>
  );
}
