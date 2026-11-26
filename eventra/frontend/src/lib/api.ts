const API_BASE = import.meta.env.VITE_API_BASE_URL || "/api";

export function getStoredToken(): string | null {
  return localStorage.getItem("eventra_token");
}

export function setStoredToken(token: string | null): void {
  if (token) {
    localStorage.setItem("eventra_token", token);
  } else {
    localStorage.removeItem("eventra_token");
  }
}

export async function apiRequest<T = any>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const errMessage =
      data?.error ||
      (Array.isArray(data?.details) && data.details[0]?.message) ||
      `Request failed with status ${response.status}`;
    const error = new Error(errMessage) as Error & { code?: string; status?: number; data?: any };
    error.code = data?.code;
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data as T;
}
