import { useState, useEffect } from "react";
import { AuthContext } from "./authContext";
import * as authApi from "../../api/auth";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem("user");
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      localStorage.removeItem("user");
      return null;
    }
  });

  const [token, setToken] = useState(() => {
    return localStorage.getItem("token") || null;
  });

  const [loading, setLoading] = useState(false);

  // Listen for expired or invalid authentication sessions.
  useEffect(() => {
    function handleSessionExpired() {
      setUser(null);
      setToken(null);

      localStorage.removeItem("user");
      localStorage.removeItem("token");
    }

    window.addEventListener("auth:session-expired", handleSessionExpired);

    return () => {
      window.removeEventListener("auth:session-expired", handleSessionExpired);
    };
  }, []);

  function saveSession(data) {
    setUser(data.user);
    setToken(data.access_token);

    localStorage.setItem("user", JSON.stringify(data.user));
    localStorage.setItem("token", data.access_token);

    return data.user;
  }

  async function login(credentials) {
    setLoading(true);

    try {
      return saveSession(await authApi.login(credentials));
    } finally {
      setLoading(false);
    }
  }

  async function register(role, details) {
    setLoading(true);

    try {
      const call =
        role === "seller"
          ? authApi.registerWholesaler
          : authApi.registerConsumer;

      return saveSession(await call(details));
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    setUser(null);
    setToken(null);

    localStorage.removeItem("user");
    localStorage.removeItem("token");
  }

  const value = {
    user,
    token,
    loading,
    isAuthenticated: Boolean(user && token),
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
