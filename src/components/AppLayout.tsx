import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { LayoutDashboard, Building2, Users, CreditCard, Receipt, Banknote, MessagesSquare, ShieldCheck as ShieldIcon, LogOut, ShieldCheck } from "lucide-react";
import { useAuth } from "../lib/auth";
import { cn } from "../lib/cn";

const NAV = [
  { to: "/", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/companies", label: "Companies", icon: Building2, end: false },
  { to: "/subscriptions", label: "Subscriptions", icon: Receipt, end: false },
  { to: "/payments", label: "Payments", icon: Banknote, end: false },
  { to: "/live-chat", label: "Live Chat", icon: MessagesSquare, end: false },
  { to: "/users", label: "Users", icon: Users, end: false },
  { to: "/plans", label: "Plans", icon: CreditCard, end: false },
  { to: "/admins", label: "Super Admins", icon: ShieldIcon, end: false },
];

export function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="flex h-screen bg-slate-950 text-slate-200">
      {/* Sidebar */}
      <aside className="flex w-64 shrink-0 flex-col border-r border-slate-800 bg-slate-900/60">
        <div className="flex items-center gap-2.5 px-5 py-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600">
            <ShieldCheck className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="text-sm font-semibold text-white">Qyad</div>
            <div className="text-[11px] uppercase tracking-wider text-indigo-400">Super Admin</div>
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-2">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-indigo-600/15 text-indigo-300"
                    : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200",
                )
              }
            >
              <item.icon className="h-4.5 w-4.5" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-slate-800 p-3">
          <div className="mb-2 px-2">
            <div className="truncate text-sm font-medium text-slate-200">{user?.name || "Super Admin"}</div>
            <div className="truncate text-xs text-slate-500">{user?.email}</div>
          </div>
          <button
            onClick={() => {
              logout();
              navigate("/login", { replace: true });
            }}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-400 hover:bg-slate-800/60 hover:text-rose-300"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
