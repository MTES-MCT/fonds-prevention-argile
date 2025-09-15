"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
  useMemo,
} from "react";
import { useRouter } from "next/navigation";
import type { AuthUser } from "../core/auth.types";
import { AUTH_METHODS } from "../core/auth.constants";

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: AuthUser | null;
  error: string | null;
  login: (password: string) => Promise<{ success: boolean; error?: string }>;
  loginWithFranceConnect: () => void;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Vérifier l'authentification via l'API
  const checkAuth = useCallback(async () => {
    try {
      const response = await fetch("/api/auth/check", {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Auth check failed");
      }

      const data = await response.json();

      setIsAuthenticated(data.authenticated);
      setUser(data.authenticated ? data.user : null);
    } catch (error) {
      console.error("Error checking auth:", error);
      setIsAuthenticated(false);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Connexion admin avec mot de passe
  const login = useCallback(
    async (password: string) => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password }),
        });

        const data = await response.json();

        if (data.success) {
          await checkAuth();
          router.push("/administration");
          return { success: true };
        } else {
          const errorMsg = data.error || "Mot de passe incorrect";
          setError(errorMsg);
          return { success: false, error: errorMsg };
        }
      } catch (err) {
        const errorMsg = "Erreur de connexion. Veuillez réessayer. " + err;
        setError(errorMsg);
        return { success: false, error: errorMsg };
      } finally {
        setIsLoading(false);
      }
    },
    [router, checkAuth]
  );

  // Connexion FranceConnect
  const loginWithFranceConnect = useCallback(() => {
    window.location.href = "/api/auth/fc/login";
  }, []);

  // Déconnexion
  const logout = useCallback(async () => {
    setIsLoading(true);

    try {
      // Déterminer la route de déconnexion selon le type d'auth
      const logoutUrl =
        user?.authMethod === AUTH_METHODS.FRANCECONNECT
          ? "/api/auth/fc/logout"
          : "/api/auth/logout";

      const response = await fetch(logoutUrl, {
        method: "POST",
      });

      const data = await response.json();

      if (response.ok) {
        setIsAuthenticated(false);
        setUser(null);
        setError(null);

        // Pour FranceConnect, gérer la redirection spéciale
        if (data.redirectUrl) {
          window.location.href = data.redirectUrl;
        } else {
          router.push("/connexion");
        }
      }
    } catch (err) {
      console.error("Erreur lors de la déconnexion:", err);
      setError("Erreur lors de la déconnexion");
    } finally {
      setIsLoading(false);
    }
  }, [router, user]);

  // Vérifier l'auth au montage
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Re-vérifier l'auth quand l'onglet redevient actif
  useEffect(() => {
    const handleFocus = () => {
      if (!isLoading) {
        checkAuth();
      }
    };

    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [checkAuth, isLoading]);

  // Mémoriser la valeur du context
  const contextValue = useMemo(
    () => ({
      isAuthenticated,
      isLoading,
      user,
      error,
      login,
      loginWithFranceConnect,
      logout,
      checkAuth,
    }),
    [
      isAuthenticated,
      isLoading,
      user,
      error,
      login,
      loginWithFranceConnect,
      logout,
      checkAuth,
    ]
  );

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
}

// Hook principal
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
