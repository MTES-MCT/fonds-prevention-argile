"use client";

import { createContext } from "react";
import { RGAFormData } from "../types";

// Interface du contexte
export interface RGAContextType {
  // État
  data: Partial<RGAFormData> | null;
  isLoading: boolean;
  hasData: boolean;

  // État dérivé
  isValid: boolean;
  errors: string[];

  // Actions
  saveRGA: (data: Partial<RGAFormData>) => boolean;
  updateRGA: (updates: Partial<RGAFormData>) => boolean;
  clearRGA: () => void;
  reloadFromStorage: () => void;

  // Validation
  validateData: () => string[];
}

// Contexte
export const RGAContext = createContext<RGAContextType | null>(null);
