import { getReferenceChorus, type SuiviChorus } from "../domain/value-objects/suivi-chorus";

export function ReferenceChorusCell({ suivi }: { suivi: SuiviChorus | null | undefined }) {
  const reference = getReferenceChorus(suivi);
  if (!reference) return <span style={{ color: "var(--text-mention-grey)" }}>—</span>;

  return (
    <>
      <span className="fr-text--xs fr-text-mention--grey">
        {reference.type === "EJ" ? "N° d'EJ" : "Tiers fournisseur"}
      </span>
      <div style={{ fontVariantNumeric: "tabular-nums" }}>{reference.valeur}</div>
    </>
  );
}
