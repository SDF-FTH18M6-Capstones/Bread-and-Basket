import { request } from "./client";

// Authentication uses the mock API server.
export const USE_MOCKS = true;

export function login(credentials) {
  return request("/login", {
    method: "POST",
    body: credentials,
  });
}

export function registerConsumer(details) {
  return request("/consumers", {
    method: "POST",
    body: details,
  });
}

export function registerWholesaler(details) {
  return request("/wholesalers", {
    method: "POST",
    body: details,
  });
}

export function getMe() {
  return request("/me");
}
