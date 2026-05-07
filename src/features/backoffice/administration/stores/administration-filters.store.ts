import { create } from "zustand";
import { DEFAULT_PERIODE } from "../tableau-de-bord/domain/types/tableau-de-bord.types";
import type { PeriodeId } from "../tableau-de-bord/domain/types/tableau-de-bord.types";
import type { PartnerKey } from "@/shared/domain/partners";

interface AdministrationFiltersState {
  periodeId: PeriodeId;
  codeDepartement: string;
  partner: PartnerKey | null;
  setPeriodeId: (id: PeriodeId) => void;
  setCodeDepartement: (code: string) => void;
  setPartner: (partner: PartnerKey | null) => void;
}

export const useAdministrationFiltersStore = create<AdministrationFiltersState>()((set) => ({
  periodeId: DEFAULT_PERIODE,
  codeDepartement: "",
  partner: null,
  setPeriodeId: (periodeId) => set({ periodeId }),
  setCodeDepartement: (codeDepartement) => set({ codeDepartement }),
  setPartner: (partner) => set({ partner }),
}));

export const selectPeriodeId = (state: AdministrationFiltersState) => state.periodeId;
export const selectCodeDepartement = (state: AdministrationFiltersState) => state.codeDepartement;
export const selectPartner = (state: AdministrationFiltersState) => state.partner;
