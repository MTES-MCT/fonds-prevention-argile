interface DsfrModalInstance {
  conceal: () => void;
  disclose: () => void;
  isDisclosed: boolean;
}

interface DsfrInstance {
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

declare global {
  var mockDSStatus: string | undefined;

  interface Window {
    dsfr?: DsfrGlobal;
  }
}

export {};