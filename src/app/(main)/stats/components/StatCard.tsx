interface StatCardProps {
  value: number;
  label: string;
}

const numberFormatter = new Intl.NumberFormat("fr-FR");

/** Carte compacte affichant un chiffre cumulé — pas de variation, page publique en lecture seule. */
export function StatCard({ value, label }: StatCardProps) {
  return (
    <div className="fr-col-12 fr-col-sm-6 fr-col-lg-4" style={{ display: "flex" }}>
      <div
        className="fr-p-3w"
        style={{
          backgroundColor: "var(--background-default-grey)",
          border: "1px solid var(--border-default-grey)",
          boxShadow: "inset 0 -4px 0 0 var(--background-flat-blue-france)",
          width: "100%",
        }}>
        <p className="fr-mb-1w" style={{ fontSize: "2.5rem", fontWeight: 700, lineHeight: 1.2 }}>
          {numberFormatter.format(value)}
        </p>
        <p className="fr-text-mention--grey fr-mb-0">{label}</p>
      </div>
    </div>
  );
}
