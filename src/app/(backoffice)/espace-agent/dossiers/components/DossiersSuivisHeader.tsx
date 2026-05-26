"use client";

interface DossiersSuivisHeaderProps {
  prenom: string | null;
}

export function DossiersSuivisHeader({ prenom }: DossiersSuivisHeaderProps) {
  const titre = prenom ? `Bonjour ${prenom}` : "Bonjour";

  return (
    <div className="fr-container fr-py-6w">
      <h1 className="fr-h1 fr-mb-0">{titre}</h1>
      <p className="fr-mt-2w fr-text--xl text-gray-500">Voici les dernières mises à jour</p>
    </div>
  );
}
