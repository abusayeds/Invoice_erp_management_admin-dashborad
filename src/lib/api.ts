import axios, { type AxiosInstance, type AxiosRequestConfig } from "axios";
import { API_BASE_URL, TOKEN_KEY } from "./env";

/* ── token store ─────────────────────────────────────────────── */
export const getToken = (): string | null => localStorage.getItem(TOKEN_KEY);
export const setToken = (t: string) => localStorage.setItem(TOKEN_KEY, t);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

/* ── unauthorized hook (wired by AuthProvider) ───────────────── */
let onUnauthorized: (() => void) | null = null;
export const setUnauthorizedHandler = (fn: () => void) => {
  onUnauthorized = fn;
};

/* ── axios instance ──────────────────────────────────────────── */
const axiosInstance: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

axiosInstance.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

axiosInstance.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error?.response?.status === 401) onUnauthorized?.();
    return Promise.reject(error);
  },
);

/** Unwrap the backend `{ success, data, ... }` envelope. */
const unwrap = <T>(body: unknown): T => {
  if (body && typeof body === "object" && "data" in (body as Record<string, unknown>)) {
    return (body as { data: T }).data;
  }
  return body as T;
};

export const toArray = <T>(v: unknown): T[] => {
  const u = unwrap<unknown>(v);
  if (Array.isArray(u)) return u as T[];
  if (u && typeof u === "object") {
    const o = u as Record<string, unknown>;
    if (Array.isArray(o.data)) return o.data as T[];
    if (Array.isArray(o.rows)) return o.rows as T[];
  }
  return [];
};

export const api = {
  raw: axiosInstance,
  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const res = await axiosInstance.get(url, config);
    return unwrap<T>(res.data);
  },
  async post<T>(url: string, body?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const res = await axiosInstance.post(url, body, config);
    return unwrap<T>(res.data);
  },
  async patch<T>(url: string, body?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const res = await axiosInstance.patch(url, body, config);
    return unwrap<T>(res.data);
  },
  async put<T>(url: string, body?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const res = await axiosInstance.put(url, body, config);
    return unwrap<T>(res.data);
  },
  async del<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const res = await axiosInstance.delete(url, config);
    return unwrap<T>(res.data);
  },
};
