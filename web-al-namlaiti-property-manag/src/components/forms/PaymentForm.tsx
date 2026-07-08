import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useData, generateCode } from "@/context/DataContext";
import type { Payment } from "@/types";

interface PaymentFormProps {
  initialData?: Payment;
  preselectedInvoiceId?: string;
  onClose: () => void;
}

const paymentMethods: Payment["method"][] = ["Bank Transfer", "Cash", "Cheque", "Card", "Online"];

export default function PaymentForm({ initialData, preselectedInvoiceId, onClose }: PaymentFormProps) {
  const { addPayment, updatePayment, invoices, payments, getTenantById } = useData();
  const isEdit = Boolean(initialData);

  const [form, setForm] = useState({
    invoiceId: initialData?.invoiceId ?? preselectedInvoiceId ?? "",
    paymentDate: initialData?.paymentDate ?? new Date().toISOString().split("T")[0],
    amount: initialData?.amount ?? 0,
    method: initialData?.method ?? "Cheque",
    reference: initialData?.reference ?? "",
    bank: "",
    chequeDate: new Date().toISOString().split("T")[0],
    notes: initialData?.notes ?? "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const selectedInvoice = invoices.find((i) => i.id === form.invoiceId);
  const tenant = selectedInvoice ? getTenantById(selectedInvoice.tenantId) : undefined;

  const update = (field: keyof typeof form, value: string | number) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const validate = () => {
    const next: Record<string, string> = {};
    if (!form.invoiceId) next.invoiceId = "Invoice is required";
    if (!form.paymentDate) next.paymentDate = "Payment date is required";
    if (form.amount <= 0) next.amount = "Amount must be greater than 0";
    if (!form.method) next.method = "Payment method is required";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate() || !selectedInvoice || !tenant) return;

    const receiptNumber = initialData?.receiptNumber ?? generateCode("RCP", payments.length);

    const payload = {
      receiptNumber,
      invoiceId: selectedInvoice.id,
      tenantId: tenant.id,
      amount: Number(form.amount),
      paymentDate: form.paymentDate,
      method: form.method as Payment["method"],
      reference: form.reference,
      notes: [form.notes, form.bank && `Bank: ${form.bank}`, form.chequeDate && form.method === "Cheque" && `Cheque date: ${form.chequeDate}`].filter(Boolean).join("\n"),
    };

    if (initialData) {
      updatePayment(initialData.id, payload);
    } else {
      addPayment(payload);
    }
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="rounded-lg border bg-card p-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="invoiceId">Invoice *</Label>
            <select
              id="invoiceId"
              value={form.invoiceId}
              onChange={(e) => update("invoiceId", e.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              disabled={Boolean(preselectedInvoiceId) && !isEdit}
            >
              <option value="">Select invoice</option>
              {invoices.map((i) => {
                const t = getTenantById(i.tenantId);
                return (
                  <option key={i.id} value={i.id}>
                    {i.invoiceNumber} — {t?.name} (Bal: {i.balance})
                  </option>
                );
              })}
            </select>
            {errors.invoiceId && <p className="text-xs text-red-500">{errors.invoiceId}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="paymentDate">Payment Date *</Label>
            <Input id="paymentDate" type="date" value={form.paymentDate} onChange={(e) => update("paymentDate", e.target.value)} />
            {errors.paymentDate && <p className="text-xs text-red-500">{errors.paymentDate}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="amount">Amount (BHD) *</Label>
            <Input id="amount" type="number" value={form.amount} onChange={(e) => update("amount", e.target.value)} />
            {errors.amount && <p className="text-xs text-red-500">{errors.amount}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="method">Payment Method *</Label>
            <select
              id="method"
              value={form.method}
              onChange={(e) => update("method", e.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              {paymentMethods.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
            {errors.method && <p className="text-xs text-red-500">{errors.method}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="reference">Reference / Cheque #</Label>
            <Input id="reference" value={form.reference} onChange={(e) => update("reference", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bank">Bank</Label>
            <Input id="bank" value={form.bank} onChange={(e) => update("bank", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="chequeDate">Cheque Date</Label>
            <Input id="chequeDate" type="date" value={form.chequeDate} onChange={(e) => update("chequeDate", e.target.value)} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" value={form.notes} onChange={(e) => update("notes", e.target.value)} />
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit">{isEdit ? "Save Changes" : "Record Payment"}</Button>
      </div>
    </form>
  );
}
