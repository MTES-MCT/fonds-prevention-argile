import { ReactNode } from "react";
import { AuthProvider } from "@/features/auth/client";
import { Footer, Header, Matomo } from "@/shared/components";

interface BackofficeLayoutProps {
  children: ReactNode;
}

/**
 * Layout pour le backoffice agents (ProConnect)
 *
 */
export default async function BackofficeLayout({ children }: BackofficeLayoutProps) {
  return (
    <AuthProvider>
      <Matomo />
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </AuthProvider>
  );
}
