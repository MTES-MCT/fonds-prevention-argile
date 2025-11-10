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
        <main className="flex-1 h-full">{children}</main>
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
        <main className="flex-1">{children}</main>
        <Footer />
      </AuthProvider>
    </>
  );
}
