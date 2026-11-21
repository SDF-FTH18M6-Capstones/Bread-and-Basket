const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export class ApiError extends Error {
  constructor(message, status = 0, fieldErrors = {}, code = null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.fieldErrors = fieldErrors;
    this.code = code;
  }
}

function getAuthToken() {
  return localStorage.getItem("token");
}

function handleUnauthorized() {
  localStorage.removeItem("user");
  localStorage.removeItem("token");

  window.dispatchEvent(new Event("auth:session-expired"));
}

export async function request(path, { method = "GET", body, signal } = {}) {
  let response;

  const token = getAuthToken();

  const headers = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal,
    });
  } catch (error) {
    if (error.name === "AbortError") {
      throw error;
    }

    throw new ApiError(
      "Cannot reach the server. Check your connection and try again.",
    );
  }

  let data = null;

  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    if (response.status === 401 && token && path !== "/login") {
      handleUnauthorized();
    }

    const message =
      data?.error || data?.message || "Something went wrong. Please try again.";

    throw new ApiError(
      message,
      response.status,
      data?.fieldErrors || {},
      data?.code || null,
    );
  }

  return data;
}

export function assetUrl(path) {
  if (!path) return null;

  return path;
}
