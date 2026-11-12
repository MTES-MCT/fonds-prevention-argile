import type { ReactNode } from "react";

interface BlocFicheProps {
  titre: string;
  icone?: string;
  badge?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}

/** Une carte de la fiche structure, au style des cartes du détail dossier. */
export function BlocFiche({ titre, icone, badge, actions, children }: BlocFicheProps) {
  return (
    <section className="fr-p-3w bg-(--background-default-grey) border border-(--border-default-grey)">
      <div className="flex flex-wrap gap-2 items-start justify-between fr-mb-2w">
        <h2 className="fr-h6 fr-mb-0 flex flex-wrap gap-2 items-center">
          {icone && <span className={`${icone} fr-icon--sm`} aria-hidden="true" />}
          {titre}
          {badge}
        </h2>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
      {children}
    </section>
  );
}

/** Sous-partie d'une carte : un intitulé discret au-dessus de son contenu. */
export function Rubrique({ titre, children }: { titre: string; children: ReactNode }) {
  return (
    <div>
      <h3 className="fr-text--sm fr-text--bold fr-mb-1w uppercase tracking-wide text-(--text-mention-grey)">{titre}</h3>
      {children}
    </div>
  );
}

/** Libellés à gauche, valeurs à droite, comme la carte du demandeur. */
export function ListeChamps({ children }: { children: ReactNode }) {
  return <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 items-baseline m-0">{children}</dl>;
}

export function Champ({ libelle, children }: { libelle: string; children: ReactNode }) {
  return (
    <>
      <dt className="text-sm text-(--text-mention-grey)">{libelle}</dt>
      <dd className="m-0 whitespace-pre-line break-words">{children}</dd>
    </>
  );
}

export function NonRenseigne({ texte = "Non renseigné" }: { texte?: string }) {
  return <span className="text-(--text-mention-grey)">{texte}</span>;
}

/** Un chiffre clé en tête de fiche. */
export function Chiffre({ valeur, libelle }: { valeur: ReactNode; libelle: string }) {
  return (
    <div className="fr-p-2w bg-(--background-default-grey) border border-(--border-default-grey) shadow-[inset_0_-4px_0_0_var(--border-plain-grey)]">
      <p className="fr-h4 fr-mb-0">{valeur}</p>
      <p className="fr-text--sm fr-mb-0 text-(--text-mention-grey)">{libelle}</p>
    </div>
  );
}
