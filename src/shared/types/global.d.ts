import type { DsfrGlobal } from "./dsfr.types";

declare global {
  interface Window {
    dsfr?: DsfrGlobal;
  }
}

export {};
