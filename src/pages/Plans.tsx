import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Check } from "lucide-react";
import { api } from "../lib/api";
import { Badge, Btn, Card, Center, Field, Modal, PageHeader, Spinner, inputCls } from "../components/ui";
import { fmtMoney } from "../lib/cn";

interface Plan {
  _id: string;
  name: string;
  description?: string;
  price_monthly: number;
  price_yearly: number;
  number_of_users: number;
  trial: boolean;
  trial_days: number;
  free_plan: boolean;
  status: boolean;
}

const emptyPlan: Omit<Plan, "_id"> = {
  name: "",
  description: "",
  price_monthly: 0,
  price_yearly: 0,
  number_of_users: 1,
  trial: false,
  trial_days: 0,
  free_plan: false,
  status: true,
};

export function Plans() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Plan | null>(null);
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);

  const { data = [], isLoading } = useQuery({
    queryKey: ["plans"],
    queryFn: async () => {
      const res = await api.get<unknown>("/subscription/plans");
      return (Array.isArray(res) ? res : ((res as { data?: Plan[] })?.data ?? [])) as Plan[];
    },
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ["plans"] });

  const save = async (payload: Omit<Plan, "_id">, id?: string) => {
    setBusy(true);
    try {
      if (id) await api.patch(`/subscription/plans/${id}`, payload);
      else await api.post("/subscription/plans/create", payload);
      setEditing(null);
      setCreating(false);
      refresh();
    } catch (e) {
      alert((e as { response?: { data?: { message?: string } } })?.response?.data?.message || "Could not save the plan.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (p: Plan) => {
    if (!confirm(`Delete the "${p.name}" plan?`)) return;
    try {
      await api.del(`/subscription/plans/${p._id}`);
      refresh();
    } catch {
      alert("Could not delete the plan.");
    }
  };

  return (
    <div className="p-6">
      <PageHeader
        title="Plans"
        subtitle="Subscription plans offered to companies"
        actions={
          <Btn onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4" /> New Plan
          </Btn>
        }
      />

      {isLoading ? (
        <Center>
          <Spinner />
        </Center>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((p) => (
            <Card key={p._id} className="flex flex-col p-5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-semibold text-white">{p.name}</h3>
                    <Badge value={p.status ? "active" : "expired"} />
                  </div>
                  {p.description && <p className="mt-1 text-xs text-slate-400">{p.description}</p>}
                </div>
                <div className="flex gap-1">
                  <button onClick={() => setEditing(p)} className="rounded-md p-1.5 text-slate-400 hover:bg-slate-800 hover:text-indigo-300">
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button onClick={() => remove(p)} className="rounded-md p-1.5 text-slate-400 hover:bg-slate-800 hover:text-rose-400">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="mt-4 flex items-end gap-1">
                <span className="text-2xl font-bold text-white">{p.free_plan ? "Free" : fmtMoney(p.price_monthly)}</span>
                {!p.free_plan && <span className="pb-1 text-xs text-slate-500">/mo</span>}
              </div>

              <div className="mt-4 space-y-2 border-t border-slate-800 pt-4 text-sm text-slate-300">
                <Line label="Yearly" value={p.free_plan ? "Free" : fmtMoney(p.price_yearly)} />
                <Line label="Users" value={String(p.number_of_users)} />
                <Line label="Trial" value={p.trial ? `${p.trial_days} days` : "No"} />
              </div>
            </Card>
          ))}
          {data.length === 0 && <div className="col-span-full py-12 text-center text-slate-500">No plans yet. Create your first plan.</div>}
        </div>
      )}

      {(creating || editing) && (
        <PlanModal
          initial={editing ?? { ...emptyPlan, _id: "" }}
          busy={busy}
          onClose={() => {
            setEditing(null);
            setCreating(false);
          }}
          onSave={(payload) => save(payload, editing?._id)}
        />
      )}
    </div>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="flex items-center gap-2 text-slate-400">
        <Check className="h-3.5 w-3.5 text-emerald-500" />
        {label}
      </span>
      <span className="font-medium text-slate-200">{value}</span>
    </div>
  );
}

function PlanModal({
  initial,
  onClose,
  onSave,
  busy,
}: {
  initial: Plan;
  onClose: () => void;
  onSave: (payload: Omit<Plan, "_id">) => void;
  busy: boolean;
}) {
  const [f, setF] = useState<Omit<Plan, "_id">>({ ...initial });
  const set = (patch: Partial<Omit<Plan, "_id">>) => setF((cur) => ({ ...cur, ...patch }));
  const num = (v: string) => Number(v) || 0;

  return (
    <Modal title={initial._id ? "Edit Plan" : "Create Plan"} onClose={onClose}>
      <div className="max-h-[70vh] space-y-4 overflow-y-auto p-6">
        <Field label="Plan Name *">
          <input value={f.name} onChange={(e) => set({ name: e.target.value })} className={inputCls} placeholder="Pro" />
        </Field>
        <Field label="Description">
          <input value={f.description} onChange={(e) => set({ description: e.target.value })} className={inputCls} placeholder="For growing teams" />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Monthly Price">
            <input type="number" value={f.price_monthly} onChange={(e) => set({ price_monthly: num(e.target.value) })} className={inputCls} />
          </Field>
          <Field label="Yearly Price">
            <input type="number" value={f.price_yearly} onChange={(e) => set({ price_yearly: num(e.target.value) })} className={inputCls} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Number of Users">
            <input type="number" value={f.number_of_users} onChange={(e) => set({ number_of_users: num(e.target.value) })} className={inputCls} />
          </Field>
          <Field label="Trial Days">
            <input type="number" value={f.trial_days} onChange={(e) => set({ trial_days: num(e.target.value), trial: num(e.target.value) > 0 })} className={inputCls} />
          </Field>
        </div>
        <div className="flex flex-wrap gap-4">
          <Toggle label="Free Plan" on={f.free_plan} onClick={() => set({ free_plan: !f.free_plan })} />
          <Toggle label="Active" on={f.status} onClick={() => set({ status: !f.status })} />
        </div>
      </div>
      <div className="flex justify-end gap-2 border-t border-slate-800 px-6 py-4">
        <Btn variant="ghost" onClick={onClose}>
          Cancel
        </Btn>
        <Btn
          onClick={() => {
            if (!f.name.trim()) return alert("Plan name is required.");
            onSave(f);
          }}
          disabled={busy}
        >
          {busy ? "Saving…" : initial._id ? "Update" : "Create"}
        </Btn>
      </div>
    </Modal>
  );
}

function Toggle({ label, on, onClick }: { label: string; on: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex items-center gap-2">
      <span className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${on ? "bg-emerald-600" : "bg-slate-700"}`}>
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${on ? "translate-x-6" : "translate-x-1"}`} />
      </span>
      <span className="text-sm text-slate-300">{label}</span>
    </button>
  );
}
