import { useState } from "react";
import { AuthContext } from "./authContext";
import * as authApi from "../../api/auth";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);

  function saveSession(data) {
    setUser(data.user);
    setToken(data.access_token);
    return data.user;
  }

  async function login(credentials) {
    return saveSession(await authApi.login(credentials));
  }

  // role is "consumer" or "seller", the same role names the API uses.
  async function register(role, details) {
    const call =
      role === "seller" ? authApi.registerWholesaler : authApi.registerConsumer;
    return saveSession(await call(details));
  }

  return (
    <AuthContext.Provider value={{ user, token, login, register }}>
      {children}
    </AuthContext.Provider>
  );
}
