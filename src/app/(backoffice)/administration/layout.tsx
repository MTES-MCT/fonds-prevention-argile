"use client";

import { ReactNode } from "react";
import { AdminProvider } from "@/features/backoffice";

interface AdminLayoutProps {
  children: ReactNode;
}

/**
 * Layout pour l'espace administration
 */
export default function AdminLayout({ children }: AdminLayoutProps) {
  return <AdminProvider>{children}</AdminProvider>;
}
