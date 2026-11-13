import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Building2, Mail, Phone, CreditCard, Users as UsersIcon, CalendarPlus, Ban, Eye } from "lucide-react";
import { api } from "../lib/api";
import { viewAsTenant } from "../lib/impersonate";
import { Badge, Btn, Card, Center, PageHeader, Spinner } from "../components/ui";
import { cn, fmtDate, fmtMoney } from "../lib/cn";
import { AssignModal } from "./Subscriptions";

interface Detail {
  company: {
    _id: string;
    name?: string;
    email?: string;
    phone?: string;
    status?: string;
    businessProfile?: { companyName?: string };
    createdAt?: string;
  };
  subscription: {
    _id: string;
    plan_name: string;
    billing_cycle: string;
    price: number;
    number_of_users: number;
    is_trial: boolean;
    start_date: string;
    end_date: string | null;
    status: string;
  } | null;
  users: { _id: string; name: string; email: string; role: string; status: string; createdAt: string }[];
  users_count: number;
}

const ROLE_BADGE: Record<string, string> = {
  company: "bg-indigo-500/15 text-indigo-300",
  staff: "bg-sky-500/15 text-sky-300",
  hr: "bg-violet-500/15 text-violet-300",
  customer: "bg-emerald-500/15 text-emerald-300",
  vendor: "bg-amber-500/15 text-amber-300",
};

export function CompanyDetail() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [showAssign, setShowAssign] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["company", id],
    queryFn: () => api.get<Detail>(`/superadmin/companies/${id}`),
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["company", id] });
    qc.invalidateQueries({ queryKey: ["subscriptions"] });
    qc.invalidateQueries({ queryKey: ["companies"] });
  };

  const patchSub = async (body: Record<string, unknown>, confirmMsg?: string) => {
    if (!data?.subscription) return;
    if (confirmMsg && !confirm(confirmMsg)) return;
    try {
      await api.patch(`/superadmin/subscriptions/${data.subscription._id}`, body);
      refresh();
    } catch {
      alert("Could not update the subscription.");
    }
  };

  if (isLoading || !data) {
    return (
      <div className="p-6">
        <Center>
          <Spinner />
        </Center>
      </div>
    );
  }

  const c = data.company;
  const name = c.businessProfile?.companyName || c.name || "—";
  const sub = data.subscription;

  return (
    <div className="p-6">
      <button onClick={() => navigate("/companies")} className="mb-4 flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200">
        <ArrowLeft className="h-4 w-4" /> Back to companies
      </button>

      <PageHeader
        title={name}
        subtitle={c.email}
        actions={
          <>
            <Btn
              variant="ghost"
              onClick={() =>
                viewAsTenant(c._id).catch(() => alert("Could not start the impersonation session."))
              }
            >
              <Eye className="h-4 w-4" /> View as Tenant
            </Btn>
            <Btn onClick={() => setShowAssign(true)}>{sub ? "Change Plan" : "Assign Plan"}</Btn>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Profile */}
        <Card className="p-5">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-white">
            <Building2 className="h-4 w-4 text-indigo-400" /> Company
          </h3>
          <dl className="space-y-3 text-sm">
            <Row icon={Building2} label="Owner" value={c.name || "—"} />
            <Row icon={Mail} label="Email" value={c.email || "—"} />
            <Row icon={Phone} label="Phone" value={c.phone || "—"} />
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Status</span>
              <Badge value={c.status || "active"} />
            </div>
            <Row icon={UsersIcon} label="Users" value={String(data.users_count)} />
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Joined</span>
              <span className="text-slate-200">{fmtDate(c.createdAt)}</span>
            </div>
          </dl>
        </Card>

        {/* Subscription */}
        <Card className="p-5 lg:col-span-2">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-white">
            <CreditCard className="h-4 w-4 text-emerald-400" /> Subscription
          </h3>
          {!sub ? (
            <div className="py-8 text-center text-sm text-slate-500">
              No subscription. <button onClick={() => setShowAssign(true)} className="text-indigo-400 hover:underline">Assign a plan</button>.
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <Kpi label="Plan" value={sub.plan_name} />
                <Kpi label="Price" value={sub.price > 0 ? `${fmtMoney(sub.price)}/${sub.billing_cycle}` : "Free"} />
                <Kpi label="Seats" value={String(sub.number_of_users)} />
                <div>
                  <div className="text-xs text-slate-500">Status</div>
                  <div className="mt-1">
                    <Badge value={sub.status} />
                  </div>
                </div>
                <Kpi label="Started" value={fmtDate(sub.start_date)} />
                <Kpi label="Ends" value={fmtDate(sub.end_date)} />
              </div>
              <div className="mt-5 flex gap-2 border-t border-slate-800 pt-4">
                <Btn variant="ghost" onClick={() => patchSub({ action: "extend", days: 30 })}>
                  <CalendarPlus className="h-4 w-4" /> Extend +30 days
                </Btn>
                {sub.status !== "cancelled" && (
                  <Btn variant="danger" onClick={() => patchSub({ action: "cancel" }, "Cancel this subscription?")}>
                    <Ban className="h-4 w-4" /> Cancel
                  </Btn>
                )}
              </div>
            </>
          )}
        </Card>
      </div>

      {/* Users */}
      <Card className="mt-6 overflow-hidden">
        <div className="border-b border-slate-800 px-5 py-4">
          <h3 className="text-sm font-semibold text-white">Users ({data.users_count})</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-left text-xs uppercase tracking-wider text-slate-500">
                <th className="px-5 py-3 font-medium">Name</th>
                <th className="px-5 py-3 font-medium">Role</th>
                <th className="px-5 py-3 font-medium">Joined</th>
                <th className="px-5 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {data.users.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-5 py-8 text-center text-slate-500">
                    No users under this company.
                  </td>
                </tr>
              ) : (
                data.users.map((u) => (
                  <tr key={u._id} className="hover:bg-slate-800/30">
                    <td className="px-5 py-3">
                      <div className="font-medium text-slate-100">{u.name}</div>
                      <div className="text-xs text-slate-500">{u.email}</div>
                    </td>
                    <td className="px-5 py-3">
                      <span className={cn("inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize", ROLE_BADGE[u.role] || "bg-slate-700/40 text-slate-300")}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-slate-400">{fmtDate(u.createdAt)}</td>
                    <td className="px-5 py-3">
                      <Badge value={u.status} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {showAssign && (
        <AssignModal
          fixedCompanyId={c._id}
          fixedCompanyName={name}
          onClose={() => setShowAssign(false)}
          onDone={() => {
            setShowAssign(false);
            refresh();
          }}
        />
      )}
    </div>
  );
}

function Row({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="flex items-center gap-2 text-slate-400">
        <Icon className="h-3.5 w-3.5" /> {label}
      </span>
      <span className="max-w-[60%] truncate text-slate-200">{value}</span>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-1 font-medium text-slate-200">{value}</div>
    </div>
  );
}
