import { formatDate } from "@/shared/utils";
import { formatMontantEuros, type SuiviChorus } from "../domain/value-objects/suivi-chorus";

interface LigneProps {
  label: string;
  valeur: string;
  renseigneAt: Date;
}

function Ligne({ label, valeur, renseigneAt }: LigneProps) {
  return (
    <div className="fr-mb-1v">
      <span className="fr-text-mention--grey">{label} : </span>
      <span style={{ fontVariantNumeric: "tabular-nums" }}>{valeur}</span>
      <span className="fr-text--xs fr-text-mention--grey"> (renseigné le {formatDate(renseigneAt.toISOString())})</span>
    </div>
  );
}

// Rattaché à la démarche d'éligibilité, seule à porter ces annotations ; masqué tant que la DDT n'a rien saisi.
export function SuiviChorusAgent({ suivi }: { suivi: SuiviChorus | null | undefined }) {
  if (!suivi) return null;
  const { tiersFournisseur, numeroEj, montantSubvention } = suivi;

  return (
    <div className="fr-text--sm">
      <p className="fr-text--sm fr-text--bold fr-mb-1v">Suivi Chorus</p>
      {tiersFournisseur && (
        <Ligne label="Tiers fournisseur" valeur={tiersFournisseur.valeur} renseigneAt={tiersFournisseur.renseigneAt} />
      )}
      {numeroEj && <Ligne label="N° d'EJ" valeur={numeroEj.valeur} renseigneAt={numeroEj.renseigneAt} />}
      {montantSubvention && (
        <Ligne
          label="Montant de la subvention"
          valeur={formatMontantEuros(montantSubvention.valeur)}
          renseigneAt={montantSubvention.renseigneAt}
        />
      )}
    </div>
  );
}
