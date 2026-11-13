import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, Plus, Ban, CheckCircle2, Trash2, Building2 } from "lucide-react";
import { api } from "../lib/api";
import { Badge, Btn, Card, Center, Field, Modal, PageHeader, Spinner, inputCls } from "../components/ui";
import { fmtDate, fmtMoney, fmtNumber } from "../lib/cn";

interface Company {
  _id: string;
  name: string;
  owner_name: string;
  email: string;
  phone: string;
  status: string;
  plan_name: string | null;
  subscription_status: string;
  subscription_price: number;
  billing_cycle: string | null;
  users_count: number;
  created_at: string;
}

export function Companies() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [busy, setBusy] = useState(false);

  const { data = [], isLoading } = useQuery({
    queryKey: ["companies", search],
    queryFn: () => api.get<Company[]>("/superadmin/companies", { params: search ? { search } : undefined }),
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["companies"] });
    qc.invalidateQueries({ queryKey: ["overview"] });
  };

  const toggleBlock = async (c: Company) => {
    const verb = c.status === "blocked" ? "unblock" : "block";
    if (!confirm(`Are you sure you want to ${verb} ${c.name}?`)) return;
    try {
      await api.post("/user/block-user", { userId: c._id });
      refresh();
    } catch {
      alert("Could not update the company status.");
    }
  };

  const remove = async (c: Company) => {
    if (!confirm(`Delete ${c.name}? This cannot be undone.`)) return;
    try {
      await api.del(`/user/delete/${c._id}`);
      refresh();
    } catch {
      alert("Could not delete the company.");
    }
  };

  return (
    <div className="p-6">
      <PageHeader
        title="Companies"
        subtitle="All tenants on the platform"
        actions={
          <Btn onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4" /> New Company
          </Btn>
        }
      />

      <div className="mb-4 flex items-center gap-2">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search companies…"
            className={`${inputCls} pl-9`}
          />
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-left text-xs uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3 font-medium">Company</th>
                <th className="px-4 py-3 font-medium">Plan</th>
                <th className="px-4 py-3 font-medium">Subscription</th>
                <th className="px-4 py-3 font-medium">Users</th>
                <th className="px-4 py-3 font-medium">Created</th>
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
                    No companies found.
                  </td>
                </tr>
              ) : (
                data.map((c) => (
                  <tr key={c._id} className="cursor-pointer hover:bg-slate-800/30" onClick={() => navigate(`/companies/${c._id}`)}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800 text-indigo-400">
                          <Building2 className="h-4 w-4" />
                        </span>
                        <div>
                          <div className="font-medium text-slate-100">{c.name}</div>
                          <div className="text-xs text-slate-500">{c.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-300">{c.plan_name || <span className="text-slate-600">—</span>}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <Badge value={c.subscription_status} />
                        {c.subscription_price > 0 && (
                          <span className="text-xs text-slate-500">
                            {fmtMoney(c.subscription_price)}/{c.billing_cycle}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-300">{fmtNumber(c.users_count)}</td>
                    <td className="px-4 py-3 text-slate-400">{fmtDate(c.created_at)}</td>
                    <td className="px-4 py-3">
                      <Badge value={c.status} />
                    </td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => toggleBlock(c)}
                          title={c.status === "blocked" ? "Unblock" : "Block"}
                          className="rounded-md p-1.5 text-slate-400 hover:bg-slate-800 hover:text-amber-400"
                        >
                          {c.status === "blocked" ? <CheckCircle2 className="h-4 w-4" /> : <Ban className="h-4 w-4" />}
                        </button>
                        <button
                          onClick={() => remove(c)}
                          title="Delete"
                          className="rounded-md p-1.5 text-slate-400 hover:bg-slate-800 hover:text-rose-400"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {showCreate && (
        <CreateCompanyModal
          busy={busy}
          onClose={() => setShowCreate(false)}
          onCreate={async (payload) => {
            setBusy(true);
            try {
              await api.post("/user/create-company-by-superadmin", payload);
              setShowCreate(false);
              refresh();
            } catch (e) {
              alert(
                (e as { response?: { data?: { message?: string } } })?.response?.data?.message ||
                  "Could not create the company.",
              );
            } finally {
              setBusy(false);
            }
          }}
        />
      )}
    </div>
  );
}

function CreateCompanyModal({
  onClose,
  onCreate,
  busy,
}: {
  onClose: () => void;
  onCreate: (payload: Record<string, unknown>) => void;
  busy: boolean;
}) {
  const [companyName, setCompanyName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");

  const submit = () => {
    if (!companyName.trim() || !email.trim() || !password.trim()) {
      alert("Company name, email and password are required.");
      return;
    }
    onCreate({
      name: ownerName.trim() || companyName.trim(),
      email: email.trim().toLowerCase(),
      password,
      phone: phone.trim() || undefined,
      role: "company",
      status: "active",
      businessProfile: { companyName: companyName.trim() },
    });
  };

  return (
    <Modal title="Create Company" onClose={onClose}>
      <div className="space-y-4 p-6">
        <Field label="Company Name *">
          <input value={companyName} onChange={(e) => setCompanyName(e.target.value)} className={inputCls} placeholder="Acme Inc." />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Owner Name">
            <input value={ownerName} onChange={(e) => setOwnerName(e.target.value)} className={inputCls} placeholder="Jane Doe" />
          </Field>
          <Field label="Phone">
            <input value={phone} onChange={(e) => setPhone(e.target.value)} className={inputCls} placeholder="+1 555…" />
          </Field>
        </div>
        <Field label="Email *">
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} placeholder="owner@acme.com" />
        </Field>
        <Field label="Password *">
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className={inputCls} placeholder="••••••••" />
        </Field>
      </div>
      <div className="flex justify-end gap-2 border-t border-slate-800 px-6 py-4">
        <Btn variant="ghost" onClick={onClose}>
          Cancel
        </Btn>
        <Btn onClick={submit} disabled={busy}>
          {busy ? "Creating…" : "Create Company"}
        </Btn>
      </div>
    </Modal>
  );
}
