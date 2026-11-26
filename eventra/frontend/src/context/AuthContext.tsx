import React, { createContext, useContext, useState, useEffect } from "react";
import { apiRequest, getStoredToken, setStoredToken } from "../lib/api";

export interface WalletInfo {
  id: string;
  blockchain: string;
  walletAddress: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: "USER" | "ORGANIZER" | "ADMIN";
  wallets?: WalletInfo[];
}

interface AuthContextValue {
  user: UserProfile | null;
  loading: boolean;
  executionMode: "LOCAL_DEMO" | "SUI_TESTNET";
  setExecutionMode: (mode: "LOCAL_DEMO" | "SUI_TESTNET") => void;
  connectedWallet: string | null;
  connectPublicWallet: (address: string) => Promise<void>;
  disconnectWallet: () => void;
  login: (email: string, password: string) => Promise<void>;
  register: (
    name: string,
    email: string,
    password: string,
    role: "USER" | "ORGANIZER" | "ADMIN"
  ) => Promise<void>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [executionMode, setExecutionModeState] = useState<"LOCAL_DEMO" | "SUI_TESTNET">(() => {
    const saved = localStorage.getItem("eventra_exec_mode");
    return saved === "SUI_TESTNET" ? "SUI_TESTNET" : "LOCAL_DEMO";
  });
  const [connectedWallet, setConnectedWallet] = useState<string | null>(() => {
    return localStorage.getItem("eventra_wallet_addr");
  });

  const setExecutionMode = (mode: "LOCAL_DEMO" | "SUI_TESTNET") => {
    setExecutionModeState(mode);
    localStorage.setItem("eventra_exec_mode", mode);
  };

  const refreshProfile = async () => {
    const token = getStoredToken();
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const data = await apiRequest<{ user: UserProfile }>("/auth/me");
      setUser(data.user);
      if (data.user.wallets && data.user.wallets.length > 0 && !connectedWallet) {
        setConnectedWallet(data.user.wallets[0].walletAddress);
      }
    } catch {
      setStoredToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshProfile();
  }, []);

  const login = async (email: string, password: string) => {
    const data = await apiRequest<{ token: string; user: UserProfile }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    setStoredToken(data.token);
    setUser(data.user);
    if (data.user.wallets && data.user.wallets.length > 0) {
      setConnectedWallet(data.user.wallets[0].walletAddress);
      localStorage.setItem("eventra_wallet_addr", data.user.wallets[0].walletAddress);
    }
  };

  const register = async (
    name: string,
    email: string,
    password: string,
    role: "USER" | "ORGANIZER" | "ADMIN"
  ) => {
    const data = await apiRequest<{ token: string; user: UserProfile }>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ name, email, password, role }),
    });
    setStoredToken(data.token);
    setUser(data.user);
  };

  const logout = () => {
    setStoredToken(null);
    setUser(null);
  };

  const connectPublicWallet = async (address: string) => {
    const trimmed = address.trim();
    if (!/^0x[a-fA-F0-9]{10,64}$/.test(trimmed)) {
      throw new Error("Invalid public Sui address format. Must start with 0x followed by hex characters.");
    }
    setConnectedWallet(trimmed);
    localStorage.setItem("eventra_wallet_addr", trimmed);
    if (user) {
      await apiRequest("/auth/wallet", {
        method: "POST",
        body: JSON.stringify({
          blockchain: "SUI_TESTNET",
          walletAddress: trimmed,
        }),
      });
      await refreshProfile();
    }
  };

  const disconnectWallet = () => {
    setConnectedWallet(null);
    localStorage.removeItem("eventra_wallet_addr");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        executionMode,
        setExecutionMode,
        connectedWallet,
        connectPublicWallet,
        disconnectWallet,
        login,
        register,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
