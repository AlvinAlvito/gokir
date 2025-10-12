import React, { createContext, useContext, useEffect, useState } from "react";

type Role = "CUSTOMER" | "STORE" | "DRIVER" | "ADMIN" | "SUPERADMIN";
type User = {
  photoUrl: any;
  id: string;
  role: Role;
  email?: string | null;
  username?: string | null;
};

type AuthCtx = {
  user: User | null;
  loading: boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthCtx>({
  user: null,
  loading: true,
  refresh: async () => { },
  signOut: async () => { },
});

const API_URL = import.meta.env.VITE_API_URL as string;

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    try {
      setLoading(true);
      const r = await fetch(`${API_URL}/auth/session?ts=${Date.now()}`, {
        credentials: "include",
        cache: "no-store",
        headers: { "Cache-Control": "no-cache" },
      });

      if (r.status !== 200) {
        setUser(null);
        return;
      }

      const json = await r.json();
      const u = json?.data?.user ?? null;
      setUser(u); // u = { id, role } atau null
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };


  const signOut = async () => {
    try {
      await fetch(`${API_URL}/auth/logout`, { method: "POST", credentials: "include" });
    } finally {
      setUser(null);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, refresh, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
