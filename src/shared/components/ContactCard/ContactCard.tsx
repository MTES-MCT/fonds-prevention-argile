type ColSize = "half" | "third";

interface ContactCardProps {
  id: string;
  nom: string;
  emails?: string | string[] | null;
  telephone?: string | null;
  adresse?: string | null;
  isSelected?: boolean;
  onSelect?: (id: string) => void;
  selectable?: boolean;
  colSize?: ColSize;
}

/**
 * Parse les emails en tableau
 * Gère les deux formats : string (séparés par ";") et string[]
 */
function parseEmails(emails: string | string[] | null | undefined): string[] {
  if (!emails) return [];

  if (Array.isArray(emails)) {
    return emails;
  }

  return emails
    .split(";")
    .map((e) => e.trim())
    .filter(Boolean);
}

/**
 * Retourne la classe de colonne en fonction de la taille
 */
function getColClass(colSize: ColSize): string {
  switch (colSize) {
    case "third":
      return "fr-col-12 fr-col-md-6 fr-col-lg-4";
    case "half":
    default:
      return "fr-col-12 fr-col-md-6";
  }
}

/**
 * Composant pour afficher les emails comme liens cliquables
 */
function EmailLinks({ emails }: { emails: string[] }) {
  if (emails.length === 0) return null;

  return (
    <>
      {emails.map((email, index) => (
        <span key={email}>
          <a href={`mailto:${email}`} className="fr-link text-gray-500 fr-text--sm">
            {email}
          </a>
          {index < emails.length - 1 && ", "}
        </span>
      ))}
    </>
  );
}

export function ContactCard({
  id,
  nom,
  emails,
  telephone,
  adresse,
  isSelected = false,
  onSelect,
  selectable = true,
  colSize = "half",
}: ContactCardProps) {
  const emailList = parseEmails(emails);
  const colClass = getColClass(colSize);

  // Mode non sélectionnable (affichage simple)
  if (!selectable) {
    return (
      <div className={colClass}>
        <div className="fr-p-2w bg-white border border-gray-200">
          <p className="fr-mb-0">{nom}</p>
          {emailList.length > 0 && (
            <p className="fr-text--sm text-gray-500 fr-mb-0">
              <EmailLinks emails={emailList} />
            </p>
          )}
          {telephone && <p className="fr-text--sm text-gray-500 fr-mb-0">{telephone}</p>}
          {adresse && <p className="fr-text--sm fr-mb-0 text-gray-500">{adresse}</p>}
        </div>
      </div>
    );
  }

  // Mode sélectionnable (radio button)
  return (
    <div className={colClass}>
      <div className="fr-fieldset__element">
        <div className="fr-radio-group fr-radio-rich">
          <input
            type="radio"
            id={`radio-contact-${id}`}
            name="contact-selection"
            value={id}
            checked={isSelected}
            onChange={() => onSelect?.(id)}
          />
          <label className="fr-label" htmlFor={`radio-contact-${id}`}>
            <span className="fr-mb-1v">{nom}</span>
            {emailList.length > 0 && (
              <span className="fr-text--sm fr-text--light text-gray-500 block">
                <EmailLinks emails={emailList} />
              </span>
            )}
            {telephone && <span className="fr-text--sm fr-text--light text-gray-500 block">{telephone}</span>}
            {adresse && <span className="fr-text--sm fr-text--light block text-gray-500">{adresse}</span>}
          </label>
        </div>
      </div>
    </div>
  );
}
