import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, ShieldCheck, Crown } from "lucide-react";
import { api } from "../lib/api";
import { Badge, Btn, Card, Center, Field, Modal, PageHeader, Spinner, inputCls } from "../components/ui";
import { fmtDate } from "../lib/cn";

interface Admin {
  _id: string;
  name: string;
  email: string;
  status: string;
  created_at: string;
  added_by: string | null;
  is_owner: boolean;
  is_you: boolean;
}

export function Admins() {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [busy, setBusy] = useState(false);

  const { data = [], isLoading } = useQuery({
    queryKey: ["admins"],
    queryFn: () => api.get<Admin[]>("/superadmin/admins"),
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ["admins"] });

  const remove = async (a: Admin) => {
    if (!confirm(`Remove super admin ${a.name} (${a.email})? They will no longer be able to sign in.`)) return;
    try {
      await api.del(`/superadmin/admins/${a._id}`);
      refresh();
    } catch (e) {
      alert((e as { response?: { data?: { message?: string } } })?.response?.data?.message || "Could not remove the super admin.");
    }
  };

  return (
    <div className="p-6">
      <PageHeader
        title="Super Admins"
        subtitle="Manage who can access this control panel"
        actions={
          <Btn onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4" /> Add Super Admin
          </Btn>
        }
      />

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-left text-xs uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Added by</th>
                <th className="px-4 py-3 font-medium">Created</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {isLoading ? (
                <tr>
                  <td colSpan={5}>
                    <Center>
                      <Spinner />
                    </Center>
                  </td>
                </tr>
              ) : (
                data.map((a) => (
                  <tr key={a._id} className="hover:bg-slate-800/30">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800 text-indigo-400">
                          <ShieldCheck className="h-4 w-4" />
                        </span>
                        <div>
                          <div className="flex items-center gap-2 font-medium text-slate-100">
                            {a.name}
                            {a.is_owner && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-medium text-amber-400 ring-1 ring-inset ring-amber-500/30">
                                <Crown className="h-3 w-3" /> Owner
                              </span>
                            )}
                            {a.is_you && <span className="text-xs text-slate-500">(you)</span>}
                          </div>
                          <div className="text-xs text-slate-500">{a.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-400">{a.added_by || <span className="text-slate-600">—</span>}</td>
                    <td className="px-4 py-3 text-slate-400">{fmtDate(a.created_at)}</td>
                    <td className="px-4 py-3">
                      <Badge value={a.status} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      {a.is_owner || a.is_you ? (
                        <span className="text-xs text-slate-600">Protected</span>
                      ) : (
                        <button
                          onClick={() => remove(a)}
                          title="Remove"
                          className="rounded-md p-1.5 text-slate-400 hover:bg-slate-800 hover:text-rose-400"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {showCreate && (
        <CreateAdminModal
          busy={busy}
          onClose={() => setShowCreate(false)}
          onCreate={async (payload) => {
            setBusy(true);
            try {
              await api.post("/superadmin/admins", payload);
              setShowCreate(false);
              refresh();
            } catch (e) {
              alert((e as { response?: { data?: { message?: string } } })?.response?.data?.message || "Could not create the super admin.");
            } finally {
              setBusy(false);
            }
          }}
        />
      )}
    </div>
  );
}

function CreateAdminModal({
  onClose,
  onCreate,
  busy,
}: {
  onClose: () => void;
  onCreate: (payload: Record<string, unknown>) => void;
  busy: boolean;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const submit = () => {
    if (!name.trim() || !email.trim() || password.length < 6) {
      alert("Name, email and a password (6+ chars) are required.");
      return;
    }
    onCreate({ name: name.trim(), email: email.trim().toLowerCase(), password });
  };

  return (
    <Modal title="Add Super Admin" onClose={onClose}>
      <div className="space-y-4 p-6">
        <Field label="Name *">
          <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} placeholder="Jane Admin" />
        </Field>
        <Field label="Email *">
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} placeholder="admin@qyad.app" />
        </Field>
        <Field label="Password *">
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className={inputCls} placeholder="At least 6 characters" />
        </Field>
        <p className="text-xs text-slate-500">
          They'll be able to sign in to this panel immediately with these credentials.
        </p>
      </div>
      <div className="flex justify-end gap-2 border-t border-slate-800 px-6 py-4">
        <Btn variant="ghost" onClick={onClose}>
          Cancel
        </Btn>
        <Btn onClick={submit} disabled={busy}>
          {busy ? "Creating…" : "Create Super Admin"}
        </Btn>
      </div>
    </Modal>
  );
}
