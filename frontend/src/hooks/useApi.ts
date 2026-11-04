import { useAppContext } from "@/context/AppContext";
import { useCallback } from "react";

export function useApi() {
  const { BACKEND_URL, session, logout } = useAppContext();
  const token = session?.access_token;

  const apiFetch = useCallback(async (path: string, init: RequestInit = {}) => {
    const response = await fetch(`${BACKEND_URL}/api${path}`, {
      ...init,
      headers: { Authorization: `Bearer ${token}`, ...init.headers },
    });

    // The session is no longer valid, so send the user back to login
    if (response.status === 401) await logout();
    if (!response.ok) throw new Error(`Request failed with status ${response.status}`);
    return response;
  }, [BACKEND_URL, token, logout]);

  const apiJson = useCallback(async <T,>(path: string, method = "GET", body?: unknown): Promise<T> => {
    const response = await apiFetch(path, {
      method,
      ...(body !== undefined && {
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    });
    return response.json();
  }, [apiFetch]);

  return { apiFetch, apiJson, isReady: !!token };
}
