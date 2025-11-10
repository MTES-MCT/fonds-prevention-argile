"use client";

import { usePathname } from "next/navigation";
import { ReactNode } from "react";
import { AuthProvider } from "@/features/auth/client";
import {
  Crisp,
  Footer,
  Header,
  Matomo,
  PostLogoutRedirect,
} from "@/shared/components";
import { ParcoursProvider } from "@/features/parcours/core/context/ParcoursProvider";

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
        <ParcoursProvider>
          <main className="flex-1 h-full">{children}</main>
        </ParcoursProvider>
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
        <ParcoursProvider>
          <main className="flex-1">{children}</main>
        </ParcoursProvider>
        <Footer />
      </AuthProvider>
    </>
  );
}
