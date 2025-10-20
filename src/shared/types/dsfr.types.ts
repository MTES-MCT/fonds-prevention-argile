/**
 * Types pour le Système de Design de l'État (DSFR)
 */

export interface DsfrModalInstance {
  conceal: () => void;
  disclose: () => void;
  isDisclosed: boolean;
}

export interface DsfrInstance {
  modal: DsfrModalInstance;
}

export interface DsfrGlobal {
  verbose: boolean;
  mode: string;
  start?: () => void;
  // Instance DSFR pour un élément donné
  (element: HTMLElement): DsfrInstance;
  [key: string]: unknown;
}
