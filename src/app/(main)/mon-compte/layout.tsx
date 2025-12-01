import { ReactNode } from "react";
import { ParcoursProvider } from "@/features/parcours/core/context/ParcoursProvider";

interface MonCompteLayoutProps {
  children: ReactNode;
}

export default function MonCompteLayout({ children }: MonCompteLayoutProps) {
  return <ParcoursProvider>{children}</ParcoursProvider>;
}
