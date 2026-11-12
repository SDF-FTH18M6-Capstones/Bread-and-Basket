const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export class ApiError extends Error {
  constructor(message, status = 0, fieldErrors = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

function fieldErrorsFrom(data) {
  const raw = data?.errors?.json;
  if (!raw || typeof raw !== "object") return {};
  const out = {};
  for (const [field, messages] of Object.entries(raw)) {
    out[field] = Array.isArray(messages) ? messages[0] : String(messages);
  }
  return out;
}

export async function request(path, { method = "GET", body } = {}) {
  let response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: { "Content-Type": "application/json" },
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
    // the response had no JSON body
  }

  if (!response.ok) {
    const fieldErrors = fieldErrorsFrom(data);
    const hasFieldErrors = Object.keys(fieldErrors).length > 0;
    const message =
      data?.error ||
      (hasFieldErrors
        ? "Please check the highlighted fields."
        : "Something went wrong. Please try again.");
    throw new ApiError(message, response.status, fieldErrors);
  }
  return data;
}
