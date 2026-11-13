// API base + token key. Defaults work with the Vite dev proxy (/api → :2002).
const backendBase = import.meta.env.VITE_BACKEND_BASE as string | undefined;
export const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ||
  (backendBase ? `${backendBase}/api/v1` : "/api/v1");

export const TOKEN_KEY = (import.meta.env.VITE_AUTH_TOKEN_KEY as string) || "qyad_superadmin_token";

// Socket.IO server origin (no /api/v1 suffix). WebSockets can't ride the Vite
// /api proxy, so connect straight to the backend origin.
export const SOCKET_URL =
  (import.meta.env.VITE_SOCKET_URL as string | undefined) ||
  backendBase ||
  "http://localhost:2002";

// The tenant web app URL — used to open a company in "view as tenant" mode.
export const TENANT_APP_URL = (import.meta.env.VITE_TENANT_APP_URL as string) || "http://localhost:8080";
