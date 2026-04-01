import { create } from "zustand";
import { DEFAULT_PERIODE } from "../tableau-de-bord/domain/types/tableau-de-bord.types";
import type { PeriodeId } from "../tableau-de-bord/domain/types/tableau-de-bord.types";

interface AdministrationFiltersState {
  periodeId: PeriodeId;
  codeDepartement: string;
  setPeriodeId: (id: PeriodeId) => void;
  setCodeDepartement: (code: string) => void;
}

export const useAdministrationFiltersStore = create<AdministrationFiltersState>()((set) => ({
  periodeId: DEFAULT_PERIODE,
  codeDepartement: "",
  setPeriodeId: (periodeId) => set({ periodeId }),
  setCodeDepartement: (codeDepartement) => set({ codeDepartement }),
}));

export const selectPeriodeId = (state: AdministrationFiltersState) => state.periodeId;
export const selectCodeDepartement = (state: AdministrationFiltersState) => state.codeDepartement;
