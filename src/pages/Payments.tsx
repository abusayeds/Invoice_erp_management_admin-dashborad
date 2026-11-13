import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { RotateCcw, CreditCard, Zap } from "lucide-react";
import { api } from "../lib/api";
import { Btn, Card, Center, Field, Modal, PageHeader, Spinner, inputCls } from "../components/ui";
import { cn, fmtDate, fmtMoney } from "../lib/cn";

interface Payment {
  _id: string;
  company_name: string;
  company_email: string;
  plan_name: string;
  amount: number;
  currency: string;
  billing_cycle: string;
  status: "paid" | "partially_refunded" | "refunded";
  refunded_amount: number;
  refund_reason: string | null;
  source: string;
  via_stripe: boolean;
  paid_at: string;
  refunded_at: string | null;
}

const STATUSES = ["all", "paid", "partially_refunded", "refunded"] as const;

const STATUS_PILL: Record<string, string> = {
  paid: "bg-emerald-500/15 text-emerald-400 ring-emerald-500/30",
  partially_refunded: "bg-amber-500/15 text-amber-400 ring-amber-500/30",
  refunded: "bg-rose-500/15 text-rose-400 ring-rose-500/30",
};

const money = (v: number, c: string) => fmtMoney(v, (c || "usd").toUpperCase());

export function Payments() {
  const qc = useQueryClient();
  const [status, setStatus] = useState<string>("all");
  const [refunding, setRefunding] = useState<Payment | null>(null);

  const { data = [], isLoading } = useQuery({
    queryKey: ["payments", status],
    queryFn: () => api.get<Payment[]>("/superadmin/payments", { params: status !== "all" ? { status } : undefined }),
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ["payments"] });

  return (
    <div className="p-6">
      <PageHeader title="Payments & Refunds" subtitle="Subscription payment ledger" />

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
            {s.replace("_", " ")}
          </button>
        ))}
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px] text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-left text-xs uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3 font-medium">Company</th>
                <th className="px-4 py-3 font-medium">Plan</th>
                <th className="px-4 py-3 font-medium">Amount</th>
                <th className="px-4 py-3 font-medium">Refunded</th>
                <th className="px-4 py-3 font-medium">Paid</th>
                <th className="px-4 py-3 font-medium">Source</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {isLoading ? (
                <tr>
                  <td colSpan={8}>
                    <Center>
                      <Spinner />
                    </Center>
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-slate-500">
                    No payments recorded yet.
                  </td>
                </tr>
              ) : (
                data.map((p) => (
                  <tr key={p._id} className="hover:bg-slate-800/30">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-100">{p.company_name}</div>
                      <div className="text-xs text-slate-500">{p.company_email}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-300">
                      {p.plan_name}
                      <span className="ml-1 text-xs text-slate-500">· {p.billing_cycle}</span>
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-200">{money(p.amount, p.currency)}</td>
                    <td className="px-4 py-3 text-slate-400">
                      {p.refunded_amount > 0 ? money(p.refunded_amount, p.currency) : "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-400">{fmtDate(p.paid_at)}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                        {p.via_stripe ? <Zap className="h-3 w-3 text-indigo-400" /> : <CreditCard className="h-3 w-3" />}
                        {p.source}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ring-1 ring-inset", STATUS_PILL[p.status])}>
                        {p.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {p.status !== "refunded" ? (
                        <button
                          onClick={() => setRefunding(p)}
                          className="inline-flex items-center gap-1.5 rounded-md border border-slate-700 px-2.5 py-1 text-xs text-slate-300 hover:bg-slate-800 hover:text-rose-300"
                        >
                          <RotateCcw className="h-3.5 w-3.5" /> Refund
                        </button>
                      ) : (
                        <span className="text-xs text-slate-600">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {refunding && (
        <RefundModal
          payment={refunding}
          onClose={() => setRefunding(null)}
          onDone={() => {
            setRefunding(null);
            refresh();
          }}
        />
      )}
    </div>
  );
}

function RefundModal({ payment, onClose, onDone }: { payment: Payment; onClose: () => void; onDone: () => void }) {
  const remaining = +(payment.amount - (payment.refunded_amount || 0)).toFixed(2);
  const [amount, setAmount] = useState(String(remaining));
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const amt = Number(amount) || 0;
    if (amt <= 0 || amt > remaining + 0.01) {
      alert(`Enter an amount between 0 and ${remaining}.`);
      return;
    }
    setBusy(true);
    try {
      await api.post(`/superadmin/payments/${payment._id}/refund`, { amount: amt, reason: reason.trim() || undefined });
      onDone();
    } catch (e) {
      alert((e as { response?: { data?: { message?: string } } })?.response?.data?.message || "Could not process the refund.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title={`Refund — ${payment.company_name}`} onClose={onClose}>
      <div className="space-y-4 p-6">
        <div className="rounded-lg border border-slate-800 bg-slate-800/40 p-3 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-400">Payment</span>
            <span className="text-slate-200">
              {payment.plan_name} · {money(payment.amount, payment.currency)}
            </span>
          </div>
          <div className="mt-1 flex justify-between">
            <span className="text-slate-400">Refundable remaining</span>
            <span className="text-slate-200">{money(remaining, payment.currency)}</span>
          </div>
          <div className="mt-1 flex justify-between">
            <span className="text-slate-400">Method</span>
            <span className="text-slate-200">{payment.via_stripe ? "Stripe refund" : "Manual (recorded)"}</span>
          </div>
        </div>
        <Field label="Refund Amount">
          <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className={inputCls} />
        </Field>
        <Field label="Reason (optional)">
          <input value={reason} onChange={(e) => setReason(e.target.value)} className={inputCls} placeholder="e.g., customer request" />
        </Field>
        {!payment.via_stripe && (
          <p className="text-xs text-amber-500/80">
            This payment has no Stripe charge on file — the refund will be recorded on the ledger only.
          </p>
        )}
      </div>
      <div className="flex justify-end gap-2 border-t border-slate-800 px-6 py-4">
        <Btn variant="ghost" onClick={onClose}>
          Cancel
        </Btn>
        <Btn variant="danger" onClick={submit} disabled={busy}>
          {busy ? "Processing…" : "Refund"}
        </Btn>
      </div>
    </Modal>
  );
}
