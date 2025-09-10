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

interface User {
  name: string;
  email: string;
  role: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  error: string | null;
  login: (password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Vérifier l'authentification via l'API
  const checkAuth = useCallback(async () => {
    try {
      const response = await fetch("/api/auth/check", {
        // Cache: évite les requêtes répétées
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

  // Connexion
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
          // Vérifier l'auth immédiatement après login
          await checkAuth();

          // Redirection
          router.push("/administration");
          return { success: true };
        } else {
          const errorMsg = data.error || "Mot de passe incorrect";
          setError(errorMsg);
          setIsLoading(false);
          return { success: false, error: errorMsg };
        }
      } catch (err) {
        const errorMsg = "Erreur de connexion. Veuillez réessayer." + err;
        setError(errorMsg);
        setIsLoading(false);
        return { success: false, error: errorMsg };
      }
    },
    [router, checkAuth]
  );

  // Déconnexion
  const logout = useCallback(async () => {
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
      });

      if (response.ok) {
        // Réinitialiser l'état immédiatement
        setIsAuthenticated(false);
        setUser(null);
        setError(null);

        // Redirection
        router.push("/connexion");
      }
    } catch (err) {
      console.error("Erreur lors de la déconnexion:", err);
      setError("Erreur lors de la déconnexion");
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  // Vérifier l'auth au montage
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Re-vérifier l'auth quand l'onglet redevient actif
  useEffect(() => {
    const handleFocus = () => {
      // Ne re-vérifier que si on n'est pas en train de charger
      if (!isLoading) {
        checkAuth();
      }
    };

    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [checkAuth, isLoading]);

  // Mémoriser la valeur du context pour éviter les re-renders
  const contextValue = useMemo(
    () => ({
      isAuthenticated,
      isLoading,
      user,
      error,
      login,
      logout,
      checkAuth,
    }),
    [isAuthenticated, isLoading, user, error, login, logout, checkAuth]
  );

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
}

// Hook personnalisé pour utiliser le context
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}

// Hook pour récupérer uniquement l'utilisateur
export function useCurrentUser() {
  const { user } = useAuth();
  return user;
}
