import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

export const fmtMoney = (v: number | undefined | null, currency = "USD") =>
  new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 2 }).format(Number(v) || 0);

export const fmtNumber = (v: number | undefined | null) => new Intl.NumberFormat("en-US").format(Number(v) || 0);

export const fmtDate = (v: unknown) => {
  if (!v) return "—";
  const d = new Date(v as string);
  return isNaN(d.getTime()) ? "—" : d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
};
