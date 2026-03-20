import { ReactNode } from "react";

interface AdminLayoutProps {
  children: ReactNode;
}

/**
 * Layout pour l'espace administration
 */
export default function AdminLayout({ children }: AdminLayoutProps) {
  return <>{children}</>;
}
