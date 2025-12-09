import { ReactNode } from "react";
import { Matomo } from "@/shared/components";
import { AuthProvider } from "@/features/auth/client";

interface EmbedLayoutProps {
  children: ReactNode;
}

export default function EmbedLayout({ children }: EmbedLayoutProps) {
  return (
    <>
      <AuthProvider>
        <Matomo />
        <main className="flex-1 h-full">{children}</main>
      </AuthProvider>
    </>
  );
}
