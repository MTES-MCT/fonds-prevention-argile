interface EtatChargementCarte {
  /** Le style MapLibre est charge (evenement `load`). */
  isReady: boolean;
  /** La selection de batiment est active (sinon : carte en lecture seule). */
  selectionEnabled: boolean;
  /** Les tuiles RNB sont chargees, donc les batiments sont cliquables. */
  layersReady: boolean;
}

// Sans selection, `layersReady` reste faux par construction (le hook qui le calcule est
// desactive) : l'attendre bloquerait l'overlay a vie sur les cartes en lecture seule.
export function estCartePrete({ isReady, selectionEnabled, layersReady }: EtatChargementCarte): boolean {
  return isReady && (!selectionEnabled || layersReady);
}
