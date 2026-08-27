import Link from "next/link";

interface AidePrefillNonDeposeProps {
  parcoursId: string;
  /** Adresses connues du demandeur, pour orienter la question à lui poser. */
  emails: string[];
}

/**
 * Ce qu'un « prérempli non déposé » veut dire, et quoi en faire (ADR-0026).
 * Le diagnostic s'arrête ici : DN masque les brouillons à l'API instructeur, donc nous ne
 * pouvons ni voir le dossier, ni savoir sous quel compte il a été commencé. L'écran outille
 * donc la conversation avec le demandeur plutôt qu'un verdict qu'on ne peut pas rendre.
 */
export function AidePrefillNonDepose({ parcoursId, emails }: AidePrefillNonDeposeProps) {
  return (
    <details className="fr-mt-1v">
      <summary className="fr-text--xs" style={{ cursor: "pointer" }}>
        Comment aider ce demandeur ?
      </summary>

      <div className="fr-mt-1v fr-text--xs" style={{ color: "var(--text-mention-grey)" }}>
        <p className="fr-mb-1v">Deux situations mènent ici, et rien ne permet de les distinguer :</p>
        <ul className="fr-mb-1v" style={{ paddingLeft: "1.2em" }}>
          <li>
            <strong>il a renoncé</strong> — souvent parce qu&apos;il n&apos;arrivait pas à se connecter à Démarches
            Numériques au moment du clic ;
          </li>
          <li>
            <strong>son brouillon vit sous un autre compte</strong> — commencé avec une adresse e-mail et un mot de
            passe, puis retour via FranceConnect (ou l&apos;inverse) : le dossier existe, mais il ne le retrouve pas.
          </li>
        </ul>

        <p className="fr-mb-1v">
          <strong>Ce que nous ne pouvons pas voir :</strong> un formulaire non transmis est invisible de notre côté. Ni
          son contenu, ni le compte Démarches Numériques utilisé. La recherche par e-mail ci-dessous ne trouve que des
          dossiers <strong>déposés</strong> : elle ne remontera pas un brouillon.
        </p>

        {emails.length > 0 && (
          <p className="fr-mb-1v">
            <strong>À lui demander :</strong> « avez-vous commencé un dossier avec une autre adresse que{" "}
            {emails.join(" ou ")} ? ». S&apos;il le retrouve, mieux vaut qu&apos;il le termine — le rattachement se fera
            tout seul au dépôt.
          </p>
        )}

        <p className="fr-mb-0">
          Sinon, <strong>réinitialisez son formulaire</strong> depuis{" "}
          <Link href={`/espace-agent/dossiers/${parcoursId}`} target="_blank" rel="noopener noreferrer">
            son dossier
          </Link>{" "}
          (menu « Gérer ») : il repartira d&apos;un lien neuf, sans rien perdre.
        </p>
      </div>
    </details>
  );
}
