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

  async function register(details) {
    return saveSession(await authApi.registerConsumer(details));
  }

  return (
    <AuthContext.Provider value={{ user, token, login, register }}>
      {children}
    </AuthContext.Provider>
  );
}
