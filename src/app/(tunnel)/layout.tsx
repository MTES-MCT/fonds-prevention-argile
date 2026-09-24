import { ReactNode } from "react";
import { AuthProvider } from "@/features/auth/client";
import { Footer, LaSuiteMessages, Matomo, PostLogoutRedirect } from "@/shared/components";
import { HeaderTunnel } from "@/shared/components/Header/HeaderTunnel";

interface TunnelLayoutProps {
  children: ReactNode;
}

/** Parcours sans sortie : le header et le footer ne proposent rien d'autre que l'aide et les mentions. */
export default function TunnelLayout({ children }: TunnelLayoutProps) {
  return (
    <>
      <PostLogoutRedirect />
      <AuthProvider>
        <Matomo />
        <LaSuiteMessages />
        <HeaderTunnel />
        <main className="flex-1">{children}</main>
        <Footer variante="tunnel" />
      </AuthProvider>
    </>
  );
}
