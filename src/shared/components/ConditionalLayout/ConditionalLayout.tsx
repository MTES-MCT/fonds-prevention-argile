"use client";

import { usePathname } from "next/navigation";
import { ReactNode } from "react";
import { AuthProvider } from "@/features/auth/client";
import { RGAProvider } from "@/features/simulateur-rga";
import {
  Crisp,
  Footer,
  Header,
  Matomo,
  PostLogoutRedirect,
} from "@/shared/components";

interface ConditionalLayoutProps {
  children: ReactNode;
}

export function ConditionalLayout({ children }: ConditionalLayoutProps) {
  const pathname = usePathname();
  const isEmbedRoute = pathname.startsWith("/embed-");

  if (isEmbedRoute) {
    // Mode embed : sans Header/Footer/Crisp/AuthProvider
    return (
      <>
        <Matomo />
        <RGAProvider>
          <main className="flex-1 h-full">{children}</main>
        </RGAProvider>
      </>
    );
  }

  // Mode normal : avec tout
  return (
    <>
      <PostLogoutRedirect />
      <AuthProvider>
        <Matomo />
        <Crisp />
        <Header />
        <RGAProvider>
          <main className="flex-1">{children}</main>
        </RGAProvider>
        <Footer />
      </AuthProvider>
    </>
  );
}
