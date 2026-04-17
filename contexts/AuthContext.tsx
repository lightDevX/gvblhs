"use client";

import { hasPermission as checkPerm, VALID_ROLES } from "@/lib/permissions";
import { useRouter } from "next/navigation";
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: string;
  permissions: string[];
  fullAccess: boolean;
  mustChangePassword: boolean;
  isActive: boolean;
}

interface AuthContextType {
  user: AdminUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string; mustChangePassword?: boolean }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: async () => ({ success: false }),
  logout: async () => {},
  refreshUser: async () => {},
  hasPermission: () => false,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const checkAuth = useCallback(async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      try {
        const response = await fetch("/api/auth/me", { signal: controller.signal });
        if (response.ok) {
          const data = await response.json();
          if (VALID_ROLES.includes(data.role)) {
            setUser({
              id: data.id,
              email: data.email,
              name: data.name || "",
              role: data.role,
              permissions: Array.isArray(data.permissions) ? data.permissions : [],
              fullAccess: data.fullAccess === true,
              mustChangePassword: data.mustChangePassword === true,
              isActive: data.isActive !== false,
            });
          } else {
            setUser(null);
          }
        } else {
          setUser(null);
        }
      } finally {
        clearTimeout(timeoutId);
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        console.error("Auth check failed: timeout");
      }
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = async (email: string, password: string) => {
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (response.ok) {
        const u = data.user;
        if (!VALID_ROLES.includes(u?.role)) {
          await fetch("/api/auth/logout", { method: "POST" });
          return { success: false, error: "Access denied" };
        }
        await checkAuth();
        return { success: true, mustChangePassword: u.mustChangePassword === true };
      } else {
        return { success: false, error: data.error };
      }
    } catch {
      return { success: false, error: "An error occurred" };
    }
  };

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    router.push("/");
  };

  const refreshUser = async () => {
    await checkAuth();
  };

  const hasPermission = (permission: string): boolean => {
    if (!user) return false;
    return checkPerm(user.role, user.fullAccess, user.permissions, permission);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshUser, hasPermission }}>
      {children}
    </AuthContext.Provider>
  );
};
