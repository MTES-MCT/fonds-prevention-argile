export function NumeroDossierDn({ numero }: { numero: number | null | undefined }) {
  if (!numero) return null;

  return (
    <p className="fr-text--sm fr-text-mention--grey fr-mt-2w fr-mb-0">
      Dossier Démarches Numériques n° <span style={{ fontVariantNumeric: "tabular-nums" }}>{numero}</span>
    </p>
  );
}
