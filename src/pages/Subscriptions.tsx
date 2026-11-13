import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarPlus, Ban, RefreshCw, Plus } from "lucide-react";
import { api } from "../lib/api";
import { Badge, Btn, Card, Center, Field, Modal, PageHeader, Spinner, inputCls } from "../components/ui";
import { cn, fmtDate, fmtMoney } from "../lib/cn";

interface Sub {
  _id: string;
  company_id: string | null;
  company_name: string;
  company_email: string;
  plan_name: string;
  billing_cycle: string;
  price: number;
  number_of_users: number;
  is_trial: boolean;
  start_date: string;
  end_date: string | null;
  status: string;
}

interface CompanyLite {
  _id: string;
  name: string;
}
interface PlanLite {
  _id: string;
  name: string;
  trial: boolean;
}

const STATUSES = ["all", "active", "trialing", "expired", "cancelled"] as const;

export function Subscriptions() {
  const qc = useQueryClient();
  const [status, setStatus] = useState<string>("all");
  const [showAssign, setShowAssign] = useState(false);

  const { data = [], isLoading } = useQuery({
    queryKey: ["subscriptions", status],
    queryFn: () => api.get<Sub[]>("/superadmin/subscriptions", { params: status !== "all" ? { status } : undefined }),
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["subscriptions"] });
    qc.invalidateQueries({ queryKey: ["overview"] });
    qc.invalidateQueries({ queryKey: ["companies"] });
  };

  const patch = async (id: string, body: Record<string, unknown>, confirmMsg?: string) => {
    if (confirmMsg && !confirm(confirmMsg)) return;
    try {
      await api.patch(`/superadmin/subscriptions/${id}`, body);
      refresh();
    } catch {
      alert("Could not update the subscription.");
    }
  };

  return (
    <div className="p-6">
      <PageHeader
        title="Subscriptions"
        subtitle="Every tenant subscription"
        actions={
          <Btn onClick={() => setShowAssign(true)}>
            <Plus className="h-4 w-4" /> Assign Plan
          </Btn>
        }
      />

      <div className="mb-4 flex flex-wrap gap-1 rounded-lg border border-slate-800 bg-slate-900/50 p-1 sm:w-fit">
        {STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={cn(
              "rounded-md px-3 py-1.5 text-xs font-medium capitalize transition-colors",
              status === s ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-slate-200",
            )}
          >
            {s}
          </button>
        ))}
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-left text-xs uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3 font-medium">Company</th>
                <th className="px-4 py-3 font-medium">Plan</th>
                <th className="px-4 py-3 font-medium">Price</th>
                <th className="px-4 py-3 font-medium">Started</th>
                <th className="px-4 py-3 font-medium">Ends</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {isLoading ? (
                <tr>
                  <td colSpan={7}>
                    <Center>
                      <Spinner />
                    </Center>
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-500">
                    No subscriptions found.
                  </td>
                </tr>
              ) : (
                data.map((s) => (
                  <tr key={s._id} className="hover:bg-slate-800/30">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-100">{s.company_name}</div>
                      <div className="text-xs text-slate-500">{s.company_email}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-300">
                      {s.plan_name}
                      <span className="ml-1 text-xs text-slate-500">· {s.billing_cycle}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-300">{s.price > 0 ? fmtMoney(s.price) : "Free"}</td>
                    <td className="px-4 py-3 text-slate-400">{fmtDate(s.start_date)}</td>
                    <td className="px-4 py-3 text-slate-400">{fmtDate(s.end_date)}</td>
                    <td className="px-4 py-3">
                      <Badge value={s.status} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => patch(s._id, { action: "extend", days: 30 })}
                          title="Extend +30 days"
                          className="rounded-md p-1.5 text-slate-400 hover:bg-slate-800 hover:text-emerald-400"
                        >
                          <CalendarPlus className="h-4 w-4" />
                        </button>
                        {s.status === "cancelled" || s.status === "expired" ? (
                          <button
                            onClick={() => patch(s._id, { action: "extend", days: 30 })}
                            title="Reactivate (+30 days)"
                            className="rounded-md p-1.5 text-slate-400 hover:bg-slate-800 hover:text-sky-400"
                          >
                            <RefreshCw className="h-4 w-4" />
                          </button>
                        ) : (
                          <button
                            onClick={() => patch(s._id, { action: "cancel" }, `Cancel ${s.company_name}'s subscription?`)}
                            title="Cancel"
                            className="rounded-md p-1.5 text-slate-400 hover:bg-slate-800 hover:text-rose-400"
                          >
                            <Ban className="h-4 w-4" />
                          </button>
                        )}
                      </div>
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

export function AssignModal({
  onClose,
  onDone,
  fixedCompanyId,
  fixedCompanyName,
}: {
  onClose: () => void;
  onDone: () => void;
  fixedCompanyId?: string;
  fixedCompanyName?: string;
}) {
  const [companyId, setCompanyId] = useState(fixedCompanyId || "");
  const [planId, setPlanId] = useState("");
  const [cycle, setCycle] = useState("monthly");
  const [busy, setBusy] = useState(false);

  const { data: companies = [] } = useQuery({
    queryKey: ["companies-lite"],
    queryFn: () => api.get<CompanyLite[]>("/superadmin/companies"),
    enabled: !fixedCompanyId,
  });
  const { data: plans = [] } = useQuery({
    queryKey: ["plans-lite"],
    queryFn: async () => {
      const res = await api.get<unknown>("/subscription/plans");
      return (Array.isArray(res) ? res : ((res as { data?: PlanLite[] })?.data ?? [])) as PlanLite[];
    },
  });

  const submit = async () => {
    if (!companyId || !planId || !cycle) {
      alert("Please choose a company, plan and billing cycle.");
      return;
    }
    setBusy(true);
    try {
      await api.post("/superadmin/subscriptions/assign", { company_id: companyId, plan_id: planId, billing_cycle: cycle });
      onDone();
    } catch (e) {
      alert((e as { response?: { data?: { message?: string } } })?.response?.data?.message || "Could not assign the plan.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title={fixedCompanyName ? `Assign Plan — ${fixedCompanyName}` : "Assign / Change Plan"} onClose={onClose}>
      <div className="space-y-4 p-6">
        {!fixedCompanyId && (
          <Field label="Company">
            <select value={companyId} onChange={(e) => setCompanyId(e.target.value)} className={inputCls}>
              <option value="">Select a company…</option>
              {companies.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
        )}
        <Field label="Plan">
          <select value={planId} onChange={(e) => setPlanId(e.target.value)} className={inputCls}>
            <option value="">Select a plan…</option>
            {plans.map((p) => (
              <option key={p._id} value={p._id}>
                {p.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Billing Cycle">
          <select value={cycle} onChange={(e) => setCycle(e.target.value)} className={inputCls}>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
            <option value="trial">Trial</option>
          </select>
        </Field>
      </div>
      <div className="flex justify-end gap-2 border-t border-slate-800 px-6 py-4">
        <Btn variant="ghost" onClick={onClose}>
          Cancel
        </Btn>
        <Btn onClick={submit} disabled={busy}>
          {busy ? "Assigning…" : "Assign Plan"}
        </Btn>
      </div>
    </Modal>
  );
}
