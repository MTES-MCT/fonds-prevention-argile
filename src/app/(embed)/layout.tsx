import { ReactNode } from "react";
import { Matomo } from "@/shared/components";

interface EmbedLayoutProps {
  children: ReactNode;
}

export default function EmbedLayout({ children }: EmbedLayoutProps) {
  return (
    <>
      <Matomo />
      <main className="flex-1 h-full">{children}</main>
    </>
  );
}
