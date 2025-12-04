"use client";

import { createContext, useContext, useState, ReactNode } from "react";
import { DEFAULT_ADMIN_TAB } from "@/features/backoffice/administration/domain/value-objects/constants";
import type { TabId } from "@/features/backoffice/administration/domain/types/tab.types";

interface AdminContextValue {
  activeTab: TabId;
  setActiveTab: (tab: TabId) => void;
}

const AdminContext = createContext<AdminContextValue | undefined>(undefined);

export function AdminProvider({ children }: { children: ReactNode }) {
  const [activeTab, setActiveTab] = useState<TabId>(DEFAULT_ADMIN_TAB);

  return <AdminContext.Provider value={{ activeTab, setActiveTab }}>{children}</AdminContext.Provider>;
}

export function useAdminTab() {
  const context = useContext(AdminContext);
  if (!context) {
    throw new Error("useAdminTab must be used within AdminProvider");
  }
  return context;
}
