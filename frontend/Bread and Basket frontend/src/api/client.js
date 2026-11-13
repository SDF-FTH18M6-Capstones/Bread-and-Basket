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

export async function request(path, { method = "GET", body } = {}) {
  let response;

  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(
      "Cannot reach the server. Check your connection and try again.",
    );
  }

  let data = null;

  try {
    data = await response.json();
  } catch {
    // The response had no JSON body.
  }

  if (!response.ok) {
    const message = data?.error || "Something went wrong. Please try again.";

    throw new ApiError(message, response.status, {}, data?.code || null);
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
