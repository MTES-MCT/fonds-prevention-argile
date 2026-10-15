import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { AdresseChoisie } from "@/shared/adapters/ban";

// sessionStorage, comme les stores des deux simulateurs : l'adresse ne survit pas à l'onglet.
const ADRESSE_CHOISIE_STORAGE_KEY = "fonds-argile-adresse-choisie";

interface AdresseChoisieState {
  adresse: AdresseChoisie | null;
  memoriser: (adresse: AdresseChoisie) => void;
  oublier: () => void;
}

export const useAdresseChoisieStore = create<AdresseChoisieState>()(
  persist(
    (set) => ({
      adresse: null,
      memoriser: (adresse) => set({ adresse }),
      oublier: () => set({ adresse: null }),
    }),
    {
      name: ADRESSE_CHOISIE_STORAGE_KEY,
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({ adresse: state.adresse }),
    }
  )
);

/** Lecture ponctuelle, pour l'état initial d'une étape : pas d'abonnement, l'étape n'a pas à se redessiner. */
export function lireAdresseChoisie(): AdresseChoisie | null {
  return useAdresseChoisieStore.getState().adresse;
}
