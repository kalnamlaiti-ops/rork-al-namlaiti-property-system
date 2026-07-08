import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useData, generateCode } from "@/context/DataContext";
import type { Invoice, InvoiceLineItem } from "@/types";

interface InvoiceFormProps {
  initialData?: Invoice;
  onClose: () => void;
}

const lineItemTypes: InvoiceLineItem["type"][] = ["Rent", "Service Charge", "EWA", "Other"];

export default function InvoiceForm({ initialData, onClose }: InvoiceFormProps) {
  const { addInvoice, updateInvoice, leases, invoices, getTenantById, getUnitById } = useData();
  const isEdit = Boolean(initialData);

  const [form, setForm] = useState({
    leaseId: initialData?.leaseId ?? "",
    invoiceDate: new Date().toISOString().split("T")[0],
    dueDate: initialData?.dueDate ?? new Date().toISOString().split("T")[0],
    periodFrom: new Date().toISOString().split("T")[0],
    periodTo: new Date().toISOString().split("T")[0],
    taxRate: 5,
    notes: initialData?.notes ?? "",
    lineItems: initialData?.lineItems ?? [{ id: "li-new", description: "Rent", amount: 0, type: "Rent" as InvoiceLineItem["type"] }],
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const selectedLease = leases.find((l) => l.id === form.leaseId);
  const tenant = selectedLease ? getTenantById(selectedLease.tenantId) : undefined;
  const unit = selectedLease ? getUnitById(selectedLease.unitId) : undefined;

  const subtotal = form.lineItems.reduce((sum, li) => sum + (Number(li.amount) || 0), 0);
  const taxAmount = subtotal * (Number(form.taxRate) || 0) / 100;
  const total = subtotal + taxAmount;

  const update = (field: keyof typeof form, value: string | number | InvoiceLineItem[]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const updateLineItem = (index: number, field: keyof InvoiceLineItem, value: string | number) => {
    setForm((prev) => ({
      ...prev,
      lineItems: prev.lineItems.map((li, i) => (i === index ? { ...li, [field]: value } : li)),
    }));
  };

  const addLineItem = () => {
    setForm((prev) => ({
      ...prev,
      lineItems: [...prev.lineItems, { id: `li-${Date.now()}`, description: "", amount: 0, type: "Other" }],
    }));
  };

  const removeLineItem = (index: number) => {
    setForm((prev) => ({
      ...prev,
      lineItems: prev.lineItems.filter((_, i) => i !== index),
    }));
  };

  const validate = () => {
    const next: Record<string, string> = {};
    if (!form.leaseId) next.leaseId = "Lease is required";
    if (!form.dueDate) next.dueDate = "Due date is required";
    if (form.lineItems.length === 0) next.lineItems = "Add at least one line item";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    if (!selectedLease || !tenant || !unit) return;

    const invoiceNumber = initialData?.invoiceNumber ?? generateCode("INV", invoices.length);
    const status = initialData?.status ?? "Draft";

    const payload = {
      invoiceNumber,
      tenantId: tenant.id,
      leaseId: selectedLease.id,
      unitId: unit.id,
      dueDate: form.dueDate,
      amount: total,
      balance: total,
      status,
      lineItems: form.lineItems.map((li) => ({ ...li, amount: Number(li.amount) })),
      notes: form.notes,
    };

    if (initialData) {
      updateInvoice(initialData.id, payload);
    } else {
      addInvoice(payload);
    }
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="rounded-lg border bg-card p-6">
        <h3 className="mb-4 text-base font-semibold">Invoice Info</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="leaseId">Lease *</Label>
            <select
              id="leaseId"
              value={form.leaseId}
              onChange={(e) => update("leaseId", e.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">Select lease</option>
              {leases.map((l) => {
                const t = getTenantById(l.tenantId);
                const u = getUnitById(l.unitId);
                return (
                  <option key={l.id} value={l.id}>
                    {l.contractNumber} — {t?.name} / {u?.unitNumber}
                  </option>
                );
              })}
            </select>
            {errors.leaseId && <p className="text-xs text-red-500">{errors.leaseId}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="invoiceDate">Invoice Date *</Label>
            <Input id="invoiceDate" type="date" value={form.invoiceDate} onChange={(e) => update("invoiceDate", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dueDate">Due Date *</Label>
            <Input id="dueDate" type="date" value={form.dueDate} onChange={(e) => update("dueDate", e.target.value)} />
            {errors.dueDate && <p className="text-xs text-red-500">{errors.dueDate}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="periodFrom">Period From</Label>
            <Input id="periodFrom" type="date" value={form.periodFrom} onChange={(e) => update("periodFrom", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="periodTo">Period To</Label>
            <Input id="periodTo" type="date" value={form.periodTo} onChange={(e) => update("periodTo", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="taxRate">Tax Rate (%)</Label>
            <Input id="taxRate" type="number" value={form.taxRate} onChange={(e) => update("taxRate", e.target.value)} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" value={form.notes} onChange={(e) => update("notes", e.target.value)} />
          </div>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold">Line Items</h3>
          <Button type="button" variant="ghost" onClick={addLineItem}>
            + Add Item
          </Button>
        </div>
        <div className="space-y-3">
          {form.lineItems.map((li, idx) => (
            <div key={li.id} className="grid gap-2 md:grid-cols-12 items-end">
              <div className="md:col-span-5">
                <Input placeholder="Description" value={li.description} onChange={(e) => updateLineItem(idx, "description", e.target.value)} />
              </div>
              <div className="md:col-span-2">
                <Input type="number" placeholder="Amount" value={li.amount} onChange={(e) => updateLineItem(idx, "amount", e.target.value)} />
              </div>
              <div className="md:col-span-3">
                <select
                  value={li.type}
                  onChange={(e) => updateLineItem(idx, "type", e.target.value)}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  {lineItemTypes.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2 flex justify-end">
                <Button type="button" variant="ghost" size="sm" onClick={() => removeLineItem(idx)} disabled={form.lineItems.length <= 1}>
                  Remove
                </Button>
              </div>
            </div>
          ))}
        </div>
        {errors.lineItems && <p className="text-xs text-red-500">{errors.lineItems}</p>}
        <div className="mt-4 space-y-1 text-right text-sm">
          <p>Subtotal: BHD {subtotal.toFixed(2)}</p>
          <p>Tax ({form.taxRate}%): BHD {taxAmount.toFixed(2)}</p>
          <p className="font-semibold">Total: BHD {total.toFixed(2)}</p>
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit">{isEdit ? "Save Changes" : "Create Invoice"}</Button>
      </div>
    </form>
  );
}
