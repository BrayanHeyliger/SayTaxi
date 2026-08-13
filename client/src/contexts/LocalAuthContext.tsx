import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type UserRole = "client" | "driver" | "fleet" | "admin" | "dispatcher";

export interface LocalUser {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
  photoUrl?: string;
}

interface LocalAuthContextType {
  user: LocalUser | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (data: RegisterData) => Promise<{ success: boolean; error?: string }>;
  updateUser: (patch: Partial<LocalUser>) => void;
  logout: () => void;
}

export interface RegisterData {
  firstName: string;
  lastName?: string;
  email: string;
  phone: string;
  password: string;
  role: UserRole;
  licenseNumber?: string;
  vehicleMake?: string;
  vehicleModel?: string;
  vehiclePlate?: string;
  companyName?: string;
}

const LocalAuthContext = createContext<LocalAuthContextType | null>(null);
const STORAGE_KEY = "wt_user";

// Call tRPC via raw fetch to avoid React hook conflicts
async function callTrpc(procedure: string, input: unknown): Promise<any> {
  const res = await fetch("/api/trpc/" + procedure, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ json: input }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message || "Error del servidor");
  return data.result?.data?.json ?? data.result?.data;
}

export function LocalAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<LocalUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Restore session from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setUser(JSON.parse(stored));
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const result = await callTrpc("localAuth.login", { email, password });
      const userData: LocalUser = {
        id: result.id,
        name: result.name,
        email: result.email,
        role: (result.role as UserRole) || "client",
        phone: result.phone ?? undefined,
        photoUrl: result.photoUrl ?? undefined,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(userData));
      setUser(userData);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || "Credenciales incorrectas" };
    }
  };

  const register = async (data: RegisterData): Promise<{ success: boolean; error?: string }> => {
    try {
      const result = await callTrpc("localAuth.register", {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
        password: data.password,
        role: data.role === "fleet" ? "fleet" : data.role,
        licenseNumber: data.licenseNumber,
        vehicleMake: data.vehicleMake,
        vehicleModel: data.vehicleModel,
        vehiclePlate: data.vehiclePlate,
        companyName: data.companyName,
      });
      const userData: LocalUser = {
        id: result.id,
        name: result.name,
        email: result.email,
        role: (result.role as UserRole) || data.role,
        photoUrl: result.photoUrl ?? undefined,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(userData));
      setUser(userData);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || "Error al registrar" };
    }
  };

  const logout = () => {
    localStorage.removeItem(STORAGE_KEY);
    setUser(null);
  };

  const updateUser = (patch: Partial<LocalUser>) => {
    setUser((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...patch };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  return (
    <LocalAuthContext.Provider value={{ user, isAuthenticated: !!user, loading, login, register, updateUser, logout }}>
      {children}
    </LocalAuthContext.Provider>
  );
}

export function useLocalAuth() {
  const ctx = useContext(LocalAuthContext);
  if (!ctx) throw new Error("useLocalAuth must be used inside LocalAuthProvider");
  return ctx;
}
