"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { RGAContext, type RGAContextType } from "./RGAContext";
import { RGAFormData } from "../types";
import {
  saveRGAToStorage,
  getRGAFromStorage,
  clearRGAFromStorage,
  updateRGAInStorage,
} from "./storage";

// Props du Provider
interface RGAProviderProps {
  children: ReactNode;
}

// Provider
export function RGAProvider({ children }: RGAProviderProps) {
  const [data, setData] = useState<Partial<RGAFormData> | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Charger les données au montage
  useEffect(() => {
    const storedData = getRGAFromStorage();
    setData(storedData);
    setIsLoading(false);
  }, []);

  // État dérivé : hasData
  const hasData = data !== null && Object.keys(data).length > 0;

  // État dérivé : validation
  const validateData = useCallback((): string[] => {
    if (!data) return ["Aucune donnée RGA"];

    const errors: string[] = [];

    if (!data.logement?.adresse) {
      errors.push("Adresse du logement manquante");
    }

    if (!data.menage?.revenu || data.menage.revenu <= 0) {
      errors.push("Revenu du ménage invalide");
    }

    if (!data.menage?.personnes || data.menage.personnes <= 0) {
      errors.push("Nombre de personnes invalide");
    }

    if (!data.logement?.type) {
      errors.push("Type de logement manquant");
    }

    return errors;
  }, [data]);

  const errors = validateData();
  const isValid = errors.length === 0;

  // Actions
  const saveRGA = useCallback((newData: Partial<RGAFormData>): boolean => {
    const success = saveRGAToStorage(newData);
    if (success) {
      setData(newData);
    }
    return success;
  }, []);

  const updateRGA = useCallback((updates: Partial<RGAFormData>): boolean => {
    const success = updateRGAInStorage(updates);
    if (success) {
      const updated = getRGAFromStorage();
      setData(updated);
    }
    return success;
  }, []);

  const clearRGA = useCallback(() => {
    clearRGAFromStorage();
    setData(null);
  }, []);

  const reloadFromStorage = useCallback(() => {
    const storedData = getRGAFromStorage();
    setData(storedData);
  }, []);

  const contextValue: RGAContextType = {
    // État
    data,
    isLoading,
    hasData,

    // État dérivé
    isValid,
    errors,

    // Actions
    saveRGA,
    updateRGA,
    clearRGA,
    reloadFromStorage,

    // Validation
    validateData,
  };

  return (
    <RGAContext.Provider value={contextValue}>{children}</RGAContext.Provider>
  );
}
