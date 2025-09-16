"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth/contexts/AuthContext";

const HeaderUser = () => {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
  };

  // Si pas d'utilisateur, ne rien afficher
  if (!user) return null;

  return (
    <Link
      href="#"
      className="fr-btn--account fr-icon-account-circle-fill fr-btn"
      onClick={handleLogout}
    >
      Me déconnecter
    </Link>
  );
};

export default HeaderUser;
