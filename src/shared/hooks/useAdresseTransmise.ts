"use client";

import { useEffect, useRef } from "react";
import {
  lireAdresseTransmise,
  resoudreAdresseTransmise,
  type ResolutionAdresseTransmise,
} from "@/shared/adapters/ban/adresse-transmise";

/** Résout une fois, au montage, l'adresse que l'intégrateur de l'iframe a mise dans le fragment d'URL. */
export function useAdresseTransmise(actif: boolean, onResolution: (resolution: ResolutionAdresseTransmise) => void) {
  const rappel = useRef(onResolution);
  rappel.current = onResolution;
  const dejaLue = useRef(false);

  useEffect(() => {
    if (!actif || dejaLue.current) return;
    dejaLue.current = true;

    const adresse = lireAdresseTransmise(window.location.hash);
    if (!adresse) return;

    resoudreAdresseTransmise(adresse)
      .then((resolution) => rappel.current(resolution))
      // BAN indisponible : le champ prérempli retombe sur la saisie habituelle.
      .catch(() => rappel.current({ statut: "a_choisir", texte: adresse.texte }));
  }, [actif]);
}
