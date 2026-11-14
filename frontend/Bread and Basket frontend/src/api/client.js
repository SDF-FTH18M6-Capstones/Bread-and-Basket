const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:4010/api";

export class ApiError extends Error {
  constructor(message, status = 0, fieldErrors = {}, code = null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.fieldErrors = fieldErrors;
    this.code = code;
  }
}

export async function request(path, { method = "GET", body } = {}) {
  let response;

  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(
      "Cannot reach the server. Check your connection and try again."
    );
  }

  let data = null;

  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    const message =
      data?.error || data?.message || "Something went wrong. Please try again.";

    throw new ApiError(message, response.status, data?.fieldErrors || {}, data?.code || null);
  }

  return data;
}

export function assetUrl(path) {
  if (!path) return null;

  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  return new URL(path, new URL(BASE_URL).origin).toString();
}