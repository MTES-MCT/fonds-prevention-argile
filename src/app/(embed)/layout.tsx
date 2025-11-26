import { ReactNode } from "react";
import { AuthProvider } from "@/features/auth/client";
import { Matomo } from "@/shared/components";
import { ParcoursProvider } from "@/features/parcours/core/context/ParcoursProvider";

interface EmbedLayoutProps {
  children: ReactNode;
}

export default function EmbedLayout({ children }: EmbedLayoutProps) {
  return (
    <AuthProvider>
      <Matomo />
      <ParcoursProvider>
        <main className="flex-1 h-full">{children}</main>
      </ParcoursProvider>
    </AuthProvider>
  );
}
