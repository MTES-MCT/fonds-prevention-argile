import type { SuiviChorus } from "../domain/value-objects/suivi-chorus";

export function ReferenceChorusCell({ suivi }: { suivi: SuiviChorus | null | undefined }) {
  const tiers = suivi?.tiersFournisseur?.valeur;
  const ej = suivi?.numeroEj?.valeur;
  if (!tiers && !ej) return <span style={{ color: "var(--text-mention-grey)" }}>—</span>;

  return (
    <div style={{ fontVariantNumeric: "tabular-nums" }}>
      {tiers && (
        <div>
          <span className="fr-text--xs fr-text-mention--grey">Tiers </span>
          {tiers}
        </div>
      )}
      {ej && (
        <div>
          <span className="fr-text--xs fr-text-mention--grey">EJ </span>
          {ej}
        </div>
      )}
    </div>
  );
}
