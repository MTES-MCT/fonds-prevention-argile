interface DsfrModalInstance {
  conceal: () => void;
  disclose: () => void;
  isDisclosed: boolean;
}

interface DsfrInstance {
  modal: DsfrModalInstance;
}

declare global {
  var mockDSStatus: string | undefined;

  interface Window {
    dsfr: (element: HTMLElement) => DsfrInstance;
  }
}

export {};
