import type { ReactNode } from "react";

interface BlocFicheProps {
  titre: string;
  badge?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}

/** Un encadré de la fiche structure : titre, actions à droite, contenu en dessous. */
export function BlocFiche({ titre, badge, actions, children }: BlocFicheProps) {
  return (
    <section className="fr-p-3w fr-mb-3w bg-(--background-default-grey) border border-(--border-default-grey)">
      <div className="flex flex-wrap gap-2 items-start justify-between fr-mb-2w">
        <h2 className="fr-h5 fr-mb-0 flex flex-wrap gap-2 items-center">
          {titre}
          {badge}
        </h2>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
      {children}
    </section>
  );
}

export function ListeChamps({ children }: { children: ReactNode }) {
  return <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 m-0">{children}</dl>;
}

export function Champ({ libelle, children }: { libelle: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-sm text-(--text-mention-grey)">{libelle}</dt>
      <dd className="m-0 whitespace-pre-line break-words">{children}</dd>
    </div>
  );
}

export function NonRenseigne({ texte = "Non renseigné" }: { texte?: string }) {
  return <span className="text-(--text-mention-grey)">{texte}</span>;
}
