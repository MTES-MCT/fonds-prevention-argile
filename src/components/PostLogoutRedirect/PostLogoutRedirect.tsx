"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function PostLogoutRedirect() {
  const router = useRouter();

  useEffect(() => {
    const redirectPath = sessionStorage.getItem("post_logout_redirect");
    if (redirectPath) {
      sessionStorage.removeItem("post_logout_redirect");
      router.push(redirectPath);
    }
  }, [router]);

  return null;
}
