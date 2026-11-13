import { useQuery } from "@tanstack/react-query";
import {
  Building2,
  Users as UsersIcon,
  CreditCard,
  DollarSign,
  TrendingUp,
  Clock,
  XCircle,
  Layers,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { api } from "../lib/api";
import { Card, Center, PageHeader, Spinner } from "../components/ui";
import { fmtMoney, fmtNumber } from "../lib/cn";

interface Overview {
  stats: {
    total_companies: number;
    total_users: number;
    mrr: number;
    active_subscriptions: number;
    trials: number;
    expired: number;
    total_plans: number;
    new_companies_7d: number;
    new_companies_30d: number;
  };
  users_by_role: Record<string, number>;
  subscriptions_by_status: { active: number; trialing: number; expired: number; cancelled: number };
  subscriptions_by_plan: { name: string; count: number }[];
  signup_trend: { month: string; companies: number }[];
}

const STATUS_COLORS: Record<string, string> = {
  active: "#10b981",
  trialing: "#f59e0b",
  expired: "#f43f5e",
  cancelled: "#64748b",
};

const ROLE_LABELS: Record<string, string> = {
  company: "Companies",
  staff: "Staff",
  hr: "HR",
  customer: "Customers",
  vendor: "Vendors",
  superadmin: "Super Admins",
};

function Stat({ icon: Icon, label, value, accent }: { icon: React.ElementType; label: string; value: string; accent: string }) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <span className="text-sm text-slate-400">{label}</span>
        <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${accent}`}>
          <Icon className="h-4.5 w-4.5" />
        </span>
      </div>
      <div className="mt-3 text-2xl font-semibold text-white">{value}</div>
    </Card>
  );
}

export function Overview() {
  const { data, isLoading } = useQuery({
    queryKey: ["overview"],
    queryFn: () => api.get<Overview>("/superadmin/overview"),
  });

  if (isLoading || !data) {
    return (
      <div className="p-6">
        <Center>
          <Spinner />
        </Center>
      </div>
    );
  }

  const s = data.stats;
  const statusData = Object.entries(data.subscriptions_by_status)
    .filter(([, v]) => v > 0)
    .map(([name, value]) => ({ name, value }));

  return (
    <div className="p-6">
      <PageHeader title="Platform Overview" subtitle="Everything happening across all tenants" />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat icon={Building2} label="Companies" value={fmtNumber(s.total_companies)} accent="bg-indigo-600/20 text-indigo-400" />
        <Stat icon={UsersIcon} label="Total Users" value={fmtNumber(s.total_users)} accent="bg-sky-600/20 text-sky-400" />
        <Stat icon={DollarSign} label="MRR" value={fmtMoney(s.mrr)} accent="bg-emerald-600/20 text-emerald-400" />
        <Stat icon={CreditCard} label="Active Subs" value={fmtNumber(s.active_subscriptions)} accent="bg-violet-600/20 text-violet-400" />
        <Stat icon={Clock} label="Trials" value={fmtNumber(s.trials)} accent="bg-amber-600/20 text-amber-400" />
        <Stat icon={XCircle} label="Expired" value={fmtNumber(s.expired)} accent="bg-rose-600/20 text-rose-400" />
        <Stat icon={Layers} label="Plans" value={fmtNumber(s.total_plans)} accent="bg-teal-600/20 text-teal-400" />
        <Stat icon={TrendingUp} label="New (30d)" value={fmtNumber(s.new_companies_30d)} accent="bg-fuchsia-600/20 text-fuchsia-400" />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Signup trend */}
        <Card className="p-5 lg:col-span-2">
          <h3 className="mb-4 text-sm font-semibold text-white">Company Signups (6 months)</h3>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={data.signup_trend}>
              <defs>
                <linearGradient id="sg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.5} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="month" stroke="#64748b" tick={{ fontSize: 12 }} />
              <YAxis stroke="#64748b" tick={{ fontSize: 12 }} allowDecimals={false} />
              <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8, color: "#e2e8f0" }} />
              <Area type="monotone" dataKey="companies" stroke="#818cf8" fill="url(#sg)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        {/* Subscriptions by status */}
        <Card className="p-5">
          <h3 className="mb-4 text-sm font-semibold text-white">Subscriptions</h3>
          {statusData.length === 0 ? (
            <div className="py-10 text-center text-sm text-slate-500">No subscriptions yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={statusData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={2}>
                  {statusData.map((d) => (
                    <Cell key={d.name} fill={STATUS_COLORS[d.name] || "#64748b"} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8, color: "#e2e8f0" }} />
              </PieChart>
            </ResponsiveContainer>
          )}
          <div className="mt-3 space-y-1.5">
            {statusData.map((d) => (
              <div key={d.name} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 capitalize text-slate-400">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: STATUS_COLORS[d.name] }} />
                  {d.name}
                </span>
                <span className="font-medium text-slate-200">{d.value}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Users by role */}
        <Card className="p-5">
          <h3 className="mb-4 text-sm font-semibold text-white">Users by Role</h3>
          <div className="space-y-3">
            {Object.entries(data.users_by_role)
              .sort((a, b) => b[1] - a[1])
              .map(([role, count]) => {
                const max = Math.max(...Object.values(data.users_by_role), 1);
                return (
                  <div key={role}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="text-slate-400">{ROLE_LABELS[role] || role}</span>
                      <span className="font-medium text-slate-200">{fmtNumber(count)}</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                      <div className="h-full rounded-full bg-indigo-500" style={{ width: `${(count / max) * 100}%` }} />
                    </div>
                  </div>
                );
              })}
          </div>
        </Card>

        {/* Subscriptions by plan */}
        <Card className="p-5">
          <h3 className="mb-4 text-sm font-semibold text-white">Active Subscriptions by Plan</h3>
          {data.subscriptions_by_plan.length === 0 ? (
            <div className="py-10 text-center text-sm text-slate-500">No active paid subscriptions</div>
          ) : (
            <div className="space-y-2">
              {data.subscriptions_by_plan.map((p) => (
                <div key={p.name} className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-800/30 px-4 py-2.5 text-sm">
                  <span className="text-slate-300">{p.name}</span>
                  <span className="font-semibold text-white">{p.count}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
