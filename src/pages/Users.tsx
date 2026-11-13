import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, Ban, CheckCircle2, Trash2 } from "lucide-react";
import { api } from "../lib/api";
import { Badge, Card, Center, PageHeader, Spinner, inputCls } from "../components/ui";
import { cn, fmtDate } from "../lib/cn";

interface UserRow {
  _id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  company: string | null;
  created_at: string;
}

const ROLES = ["all", "company", "staff", "hr", "customer", "vendor"] as const;

const ROLE_BADGE: Record<string, string> = {
  company: "bg-indigo-500/15 text-indigo-300",
  staff: "bg-sky-500/15 text-sky-300",
  hr: "bg-violet-500/15 text-violet-300",
  customer: "bg-emerald-500/15 text-emerald-300",
  vendor: "bg-amber-500/15 text-amber-300",
  superadmin: "bg-rose-500/15 text-rose-300",
};

export function Users() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [role, setRole] = useState<string>("all");

  const { data = [], isLoading } = useQuery({
    queryKey: ["users", search, role],
    queryFn: () =>
      api.get<UserRow[]>("/superadmin/users", {
        params: { ...(search ? { search } : {}), ...(role !== "all" ? { role } : {}) },
      }),
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["users"] });
    qc.invalidateQueries({ queryKey: ["overview"] });
  };

  const toggleBlock = async (u: UserRow) => {
    const verb = u.status === "blocked" ? "unblock" : "block";
    if (!confirm(`${verb.charAt(0).toUpperCase() + verb.slice(1)} ${u.name}?`)) return;
    try {
      await api.post("/user/block-user", { userId: u._id });
      refresh();
    } catch {
      alert("Could not update user status.");
    }
  };

  const remove = async (u: UserRow) => {
    if (!confirm(`Delete ${u.name}? This cannot be undone.`)) return;
    try {
      await api.del(`/user/delete/${u._id}`);
      refresh();
    } catch {
      alert("Could not delete user.");
    }
  };

  return (
    <div className="p-6">
      <PageHeader title="Users" subtitle="Every user across all tenants" />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1 rounded-lg border border-slate-800 bg-slate-900/50 p-1">
          {ROLES.map((r) => (
            <button
              key={r}
              onClick={() => setRole(r)}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-medium capitalize transition-colors",
                role === r ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-slate-200",
              )}
            >
              {r}
            </button>
          ))}
        </div>
        <div className="relative sm:max-w-xs sm:flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search users…" className={`${inputCls} pl-9`} />
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-left text-xs uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Company</th>
                <th className="px-4 py-3 font-medium">Joined</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {isLoading ? (
                <tr>
                  <td colSpan={6}>
                    <Center>
                      <Spinner />
                    </Center>
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                    No users found.
                  </td>
                </tr>
              ) : (
                data.map((u) => (
                  <tr key={u._id} className="hover:bg-slate-800/30">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-100">{u.name}</div>
                      <div className="text-xs text-slate-500">{u.email}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn("inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize", ROLE_BADGE[u.role] || "bg-slate-700/40 text-slate-300")}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-300">{u.company || <span className="text-slate-600">—</span>}</td>
                    <td className="px-4 py-3 text-slate-400">{fmtDate(u.created_at)}</td>
                    <td className="px-4 py-3">
                      <Badge value={u.status} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {u.role !== "superadmin" && (
                          <>
                            <button
                              onClick={() => toggleBlock(u)}
                              title={u.status === "blocked" ? "Unblock" : "Block"}
                              className="rounded-md p-1.5 text-slate-400 hover:bg-slate-800 hover:text-amber-400"
                            >
                              {u.status === "blocked" ? <CheckCircle2 className="h-4 w-4" /> : <Ban className="h-4 w-4" />}
                            </button>
                            <button
                              onClick={() => remove(u)}
                              title="Delete"
                              className="rounded-md p-1.5 text-slate-400 hover:bg-slate-800 hover:text-rose-400"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </>
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
    </div>
  );
}
