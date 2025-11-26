import { ReactNode } from "react";
import { AuthProvider } from "@/features/auth/client";
import { Crisp, Footer, Header, Matomo, PostLogoutRedirect } from "@/shared/components";

interface MainLayoutProps {
  children: ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
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
