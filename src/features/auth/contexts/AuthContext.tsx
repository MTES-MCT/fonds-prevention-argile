"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode, useMemo } from "react";
import { useRouter } from "next/navigation";
import { AuthUser } from "../domain/entities";
import { AUTH_METHODS, ROUTES } from "../domain/value-objects";

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  isLoggingOut: boolean;
  user: AuthUser | null;
  logout: (redirectTo?: string) => Promise<void>;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const router = useRouter();

  // Vérifier l'authentification via l'API
  const checkAuth = useCallback(async () => {
    try {
      const response = await fetch(ROUTES.api.auth.check, {
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

  // Déconnexion
  const logout = useCallback(
    async (redirectTo?: string) => {
      setIsLoading(true);
      setIsLoggingOut(true);

      // Stocker l'URL de redirection après déconnexion
      if (redirectTo) {
        sessionStorage.setItem("post_logout_redirect", redirectTo);
      }

      try {
        // Déterminer la route de déconnexion selon le type d'auth
        let logoutUrl = "/";

        if (user?.authMethod === AUTH_METHODS.FRANCECONNECT) {
          logoutUrl = ROUTES.api.auth.fc.logout;
        } else if (user?.authMethod === AUTH_METHODS.PROCONNECT) {
          logoutUrl = ROUTES.api.auth.pc.logout;
        }

        const response = await fetch(logoutUrl, {
          method: "POST",
        });

        const data = await response.json();

        if (response.ok) {
          setIsAuthenticated(false);
          setUser(null);

          // Stocker le flag de déconnexion dans localStorage
          localStorage.setItem("logout_success", "true");

          // Utiliser l'URL de redirection fournie par l'API
          if (data.redirectUrl) {
            if (data.redirectUrl.startsWith("http")) {
              // URL externe (FranceConnect / ProConnect)
              window.location.href = data.redirectUrl;
            } else {
              // URL interne
              router.push(data.redirectUrl);
            }
          } else {
            // Fallback
            router.push("/");
          }
        }
      } catch (err) {
        console.error("Erreur lors de la déconnexion:", err);
        // En cas d'erreur, rediriger quand même vers l'accueil
        setIsAuthenticated(false);
        setUser(null);
        router.push("/");
      } finally {
        setIsLoading(false);
        setIsLoggingOut(false);
      }
    },
    [router, user]
  );

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
      isLoggingOut,
      user,
      logout,
      checkAuth,
    }),
    [isAuthenticated, isLoading, isLoggingOut, user, logout, checkAuth]
  );

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
}

// Hook principal
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
