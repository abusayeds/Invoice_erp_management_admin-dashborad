import type { ReactNode } from "react";
import { cn } from "../lib/cn";

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-xl font-semibold text-white">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-slate-400">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("rounded-xl border border-slate-800 bg-slate-900/50", className)}>{children}</div>;
}

export function Spinner({ className }: { className?: string }) {
  return <div className={cn("h-6 w-6 animate-spin rounded-full border-2 border-slate-700 border-t-indigo-500", className)} />;
}

export function Center({ children }: { children: ReactNode }) {
  return <div className="flex min-h-[200px] items-center justify-center">{children}</div>;
}

const BADGE: Record<string, string> = {
  active: "bg-emerald-500/15 text-emerald-400 ring-emerald-500/30",
  trialing: "bg-amber-500/15 text-amber-400 ring-amber-500/30",
  trial: "bg-amber-500/15 text-amber-400 ring-amber-500/30",
  expired: "bg-rose-500/15 text-rose-400 ring-rose-500/30",
  cancelled: "bg-slate-500/15 text-slate-400 ring-slate-500/30",
  blocked: "bg-rose-500/15 text-rose-400 ring-rose-500/30",
  none: "bg-slate-500/15 text-slate-400 ring-slate-500/30",
};
export function Badge({ value }: { value: string }) {
  const key = (value || "none").toLowerCase();
  return (
    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset", BADGE[key] || BADGE.none)}>
      {value || "—"}
    </span>
  );
}

export function Btn({
  children,
  onClick,
  variant = "primary",
  type = "button",
  disabled,
  className,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "ghost" | "danger";
  type?: "button" | "submit";
  disabled?: boolean;
  className?: string;
}) {
  const styles = {
    primary: "bg-indigo-600 text-white hover:bg-indigo-500",
    ghost: "border border-slate-700 text-slate-300 hover:bg-slate-800",
    danger: "bg-rose-600 text-white hover:bg-rose-500",
  }[variant];
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn("inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50", styles, className)}
    >
      {children}
    </button>
  );
}

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(0,0,0,0.6)" }} onClick={onClose}>
      <div className="w-full max-w-lg rounded-xl border border-slate-800 bg-slate-900 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="border-b border-slate-800 px-6 py-4">
          <h2 className="text-base font-semibold text-white">{title}</h2>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-400">{label}</span>
      {children}
    </label>
  );
}

export const inputCls =
  "w-full rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500";
