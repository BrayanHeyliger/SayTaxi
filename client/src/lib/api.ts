const configuredApiBaseUrl = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim();

/**
 * Base pública del backend. Vacía en desarrollo para conservar las rutas relativas
 * de Vite/Express; definida en Netlify para apuntar al backend desplegado.
 */
export const API_BASE_URL = configuredApiBaseUrl
  ? configuredApiBaseUrl.replace(/\/$/, "")
  : "";

export function apiUrl(pathname: string): string {
  const path = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return `${API_BASE_URL}${path}`;
}

export function getApiOrigin(): string {
  if (API_BASE_URL) return API_BASE_URL;
  return typeof window === "undefined" ? "" : window.location.origin;
}
