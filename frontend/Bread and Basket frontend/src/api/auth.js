import { request } from "./client";
import * as mockAuth from "../mocks/auth";

const USE_MOCKS = import.meta.env.VITE_USE_MOCKS !== "false";

export function login(credentials) {
  return USE_MOCKS
    ? mockAuth.login(credentials)
    : request("/login", { method: "POST", body: credentials });
}

export function registerConsumer(details) {
  return USE_MOCKS
    ? mockAuth.registerConsumer(details)
    : request("/consumers", { method: "POST", body: details });
}
