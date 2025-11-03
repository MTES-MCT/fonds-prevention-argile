"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { RGAContext } from "./RGAContext";
import type { PartialRGAFormData } from "../domain/entities";
import { storageAdapter } from "../adapters/storage.adapter";
import { validateRGAData } from "../services/validator.service";
import { RGAContextType } from "./RGAContext.types";

interface RGAProviderProps {
  children: ReactNode;
}

/**
 * Provider du contexte RGA
 */
export function RGAProvider({ children }: RGAProviderProps) {
  const [data, setData] = useState<PartialRGAFormData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Charger au montage
  useEffect(() => {
    const storedData = storageAdapter.get();
    setData(storedData);
    setIsLoading(false);
  }, []);

  // État dérivé
  const hasData = data !== null && Object.keys(data).length > 0;
  const errors = validateRGAData(data || {});
  const isValid = errors.length === 0;

  // Actions
  const saveRGA = useCallback((newData: PartialRGAFormData): boolean => {
    storageAdapter.clear(); // Clear avant save
    const success = storageAdapter.save(newData);
    if (success) {
      setData(newData);
    }
    return success;
  }, []);

  const updateRGA = useCallback((updates: PartialRGAFormData): boolean => {
    const success = storageAdapter.update(updates);
    if (success) {
      const updated = storageAdapter.get();
      setData(updated);
    }
    return success;
  }, []);

  const clearRGA = useCallback(() => {
    storageAdapter.clear();
    setData(null);
  }, []);

  const reloadFromStorage = useCallback(() => {
    const storedData = storageAdapter.get();
    setData(storedData);
  }, []);

  const contextValue: RGAContextType = {
    data,
    isLoading,
    hasData,
    isValid,
    errors,
    saveRGA,
    updateRGA,
    clearRGA,
    reloadFromStorage,
    validateRGAData,
  };

  return (
    <RGAContext.Provider value={contextValue}>{children}</RGAContext.Provider>
  );
}
