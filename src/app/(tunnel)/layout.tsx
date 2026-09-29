import { ReactNode } from "react";
import { AuthProvider } from "@/features/auth/client";
import { Footer, LaSuiteMessages, Matomo, PostLogoutRedirect } from "@/shared/components";
import { HeaderTunnel } from "@/shared/components/Header/HeaderTunnel";

interface TunnelLayoutProps {
  children: ReactNode;
}

/** Parcours sans sortie : le header ne propose rien d'autre que l'aide. */
export default function TunnelLayout({ children }: TunnelLayoutProps) {
  return (
    <>
      <PostLogoutRedirect />
      <AuthProvider>
        <Matomo />
        <LaSuiteMessages />
        <HeaderTunnel />
        <main className="flex-1">{children}</main>
        <Footer />
      </AuthProvider>
    </>
  );
}
