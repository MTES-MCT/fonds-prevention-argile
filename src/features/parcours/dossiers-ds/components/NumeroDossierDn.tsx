export function NumeroDossierDn({
  numero,
  className = "fr-mt-2w fr-mb-0",
}: {
  numero: number | string | null | undefined;
  className?: string;
}) {
  if (!numero) return null;

  return (
    <p className={`fr-text--sm fr-text-mention--grey ${className}`}>
      Dossier Démarches Numériques n° <span style={{ fontVariantNumeric: "tabular-nums" }}>{numero}</span>
    </p>
  );
}
