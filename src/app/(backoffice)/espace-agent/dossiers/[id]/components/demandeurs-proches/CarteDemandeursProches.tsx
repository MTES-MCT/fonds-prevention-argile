"use client";

import dynamic from "next/dynamic";

// maplibre ne se rend pas côté serveur.
export const CarteDemandeursProches = dynamic(
  () => import("./CarteDemandeursProchesMap").then((m) => m.CarteDemandeursProchesMap),
  {
    ssr: false,
    loading: () => <p className="fr-text--sm fr-text-mention--grey">Chargement de la carte...</p>,
  }
);
