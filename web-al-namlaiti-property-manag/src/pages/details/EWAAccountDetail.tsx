import { useMemo, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/StatusBadge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog";
import { useData } from "@/context/DataContext";
import EWAAccountForm from "@/components/forms/EWAAccountForm";
import { computeAllocation } from "@/lib/ewaAllocation";
import {
  ArrowLeft,
  Pencil,
  Building2,
  Zap,
  Link2,
  Users,
  Wallet,
  Calculator,
  Send,
  RefreshCw,
  Trash2,
  AlertTriangle,
  Home,
  FileText,
  Calendar,
} from "lucide-react";
import type { EWADistribution } from "@/types";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-BH", { style: "currency", currency: "BHD", maximumFractionDigits: 2 }).format(amount);
}

const methodLabels = {
  equal: "Equal Split",
  percentage: "Percentage",
  fixed: "Fixed Amount",
  meter: "Sub-Meter",
} as const;

export default function EWAAccountDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    ewaAccounts,
    ewaDistributions,
    getBuildingById,
    units,
    leases,
    tenants,
    ewaBills,
    createEWADistribution,
    recalculateEWADistribution,
    processEWADistribution,
    deleteEWADistribution,
    deleteEWAAccount,
  } = useData();

  const [editOpen, setEditOpen] = useState(false);
  const [billDialogOpen, setBillDialogOpen] = useState(false);
  const [deletingDist, setDeletingDist] = useState<EWADistribution | undefined>();
  const [deletingAccount, setDeletingAccount] = useState(false);

  // Bill entry form state
  const [billForm, setBillForm] = useState({
    month: new Date().toISOString().slice(0, 7),
    totalAmount: 0,
    dueDate: new Date().toISOString().split("T")[0],
    notes: "",
  });
  const [billError, setBillError] = useState("");

  const account = id ? ewaAccounts.find((a) => a.id === id) : undefined;

  const accountDistributions = useMemo(
    () => (account ? ewaDistributions.filter((d) => d.accountId === account.id) : []),
    [account, ewaDistributions],
  );

  // Live preview of allocation for the bill dialog.
  const preview = useMemo(() => {
    if (!account) return null;
    return computeAllocation({
      account,
      totalAmount: Number(billForm.totalAmount) || 0,
      units,
      leases,
      tenants,
    });
  }, [account, billForm.totalAmount, units, leases, tenants]);

  if (!account) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate("/ewa-accounts")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <p className="text-muted-foreground">EWA account not found.</p>
      </div>
    );
  }

  const building = getBuildingById(account.buildingId);
  const linkedUnits = account.linkedUnitIds
    .map((uid) => units.find((u) => u.id === uid))
    .filter((u): u is NonNullable<typeof u> => Boolean(u));

  const occupiedCount = linkedUnits.filter((u) => u.status === "Occupied").length;
  const vacantCount = linkedUnits.filter((u) => u.status === "Vacant").length;

  const totalBilled = accountDistributions.reduce((s, d) => s + d.totalAmount, 0);
  const totalAllocated = accountDistributions.reduce((s, d) => s + d.allocatedAmount, 0);
  const totalRemaining = accountDistributions.reduce((s, d) => s + d.remainingBalance, 0);

  const submitBill = (e: React.FormEvent) => {
    e.preventDefault();
    setBillError("");
    if (!billForm.month) {
      setBillError("Month is required");
      return;
    }
    if (Number(billForm.totalAmount) <= 0) {
      setBillError("Total amount must be greater than zero");
      return;
    }
    const created = createEWADistribution({
      accountId: account.id,
      month: billForm.month,
      totalAmount: Number(billForm.totalAmount),
      dueDate: billForm.dueDate,
      notes: billForm.notes || undefined,
    });
    if (created) {
      setBillDialogOpen(false);
      setBillForm({ ...billForm, totalAmount: 0, notes: "" });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => navigate("/ewa-accounts")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setEditOpen(true)}>
            <Pencil className="mr-2 h-4 w-4" /> Edit
          </Button>
          <Button
            variant="outline"
            className="text-red-600 hover:bg-red-50 hover:text-red-700"
            onClick={() => setDeletingAccount(true)}
          >
            <Trash2 className="mr-2 h-4 w-4" /> Delete
          </Button>
        </div>
      </div>

      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-foreground">{account.accountNumber}</h1>
          <StatusBadge status={account.status} />
        </div>
        {account.nickname && <p className="text-sm text-muted-foreground">{account.nickname}</p>}
      </div>

      {/* Dashboard cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Billed</p>
              <p className="mt-2 text-2xl font-bold text-foreground">{formatCurrency(totalBilled)}</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
              <Wallet className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Amount Allocated</p>
              <p className="mt-2 text-2xl font-bold text-emerald-600">{formatCurrency(totalAllocated)}</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
              <Calculator className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Remaining Balance</p>
              <p className="mt-2 text-2xl font-bold text-amber-600">{formatCurrency(totalRemaining)}</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
              <AlertTriangle className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Linked Units</p>
              <p className="mt-2 text-2xl font-bold text-foreground">
                {linkedUnits.length}
                <span className="ml-1 text-sm font-normal text-muted-foreground">
                  ({occupiedCount} occ / {vacantCount} vacant)
                </span>
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
              <Link2 className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Account details + allocation method */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardContent className="p-6">
            <h3 className="mb-4 text-base font-semibold">Account Details</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-sm text-muted-foreground">Account Number</p>
                <p className="font-medium">{account.accountNumber}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Building</p>
                <p className="font-medium flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  {building ? (
                    <Link to={`/buildings/${building.id}`} className="text-primary hover:underline">
                      {building.name}
                    </Link>
                  ) : (
                    "—"
                  )}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Allocation Method</p>
                <p className="font-medium">{methodLabels[account.allocationMethod]}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Vacant Unit Handling</p>
                <p className="font-medium capitalize">{account.vacantAction}</p>
              </div>
              {account.notes && (
                <div className="sm:col-span-2">
                  <p className="text-sm text-muted-foreground">Notes</p>
                  <p className="font-medium">{account.notes}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h3 className="mb-4 text-base font-semibold">Quick Actions</h3>
            <div className="space-y-2">
              <Button
                className="w-full justify-start"
                onClick={() => setBillDialogOpen(true)}
              >
                <Zap className="mr-2 h-4 w-4" /> Enter Monthly Bill
              </Button>
              <Button
                variant="secondary"
                className="w-full justify-start"
                onClick={() => navigate("/ewa-bills")}
              >
                <FileText className="mr-2 h-4 w-4" /> View All EWA Bills
              </Button>
              <Button
                variant="secondary"
                className="w-full justify-start"
                onClick={() => navigate("/invoices")}
              >
                <Send className="mr-2 h-4 w-4" /> Go to Invoices
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Linked units */}
      <Card>
        <CardContent className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-base font-semibold">Linked Units ({linkedUnits.length})</h3>
            <Button size="sm" variant="outline" onClick={() => setEditOpen(true)}>
              <Pencil className="mr-1 h-3.5 w-3.5" /> Manage Links
            </Button>
          </div>
          {linkedUnits.length === 0 ? (
            <p className="text-sm text-muted-foreground">No units linked to this account.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Unit #</th>
                    <th className="px-4 py-3 text-left font-medium">Status</th>
                    <th className="px-4 py-3 text-left font-medium">Tenant</th>
                    {account.allocationMethod === "percentage" && (
                      <th className="px-4 py-3 text-left font-medium">Percentage</th>
                    )}
                    {account.allocationMethod === "fixed" && (
                      <th className="px-4 py-3 text-left font-medium">Fixed Amount</th>
                    )}
                    {account.allocationMethod === "meter" && (
                      <>
                        <th className="px-4 py-3 text-left font-medium">Previous</th>
                        <th className="px-4 py-3 text-left font-medium">Current</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {linkedUnits.map((u) => {
                    const lease = leases.find((l) => l.unitId === u.id && l.status === "Active");
                    const tenant = lease ? tenants.find((t) => t.id === lease.tenantId) : undefined;
                    const rule = account.rules.find((r) => r.unitId === u.id);
                    return (
                      <tr key={u.id} className="hover:bg-muted/30">
                        <td className="px-4 py-3">
                          <Link to={`/units/${u.id}`} className="font-medium text-primary hover:underline">
                            {u.unitNumber}
                          </Link>
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={u.status} />
                        </td>
                        <td className="px-4 py-3">
                          {tenant ? (
                            <Link to={`/tenants/${tenant.id}`} className="text-primary hover:underline">
                              {tenant.name}
                            </Link>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        {account.allocationMethod === "percentage" && (
                          <td className="px-4 py-3 font-medium">{rule?.percentage ?? 0}%</td>
                        )}
                        {account.allocationMethod === "fixed" && (
                          <td className="px-4 py-3 font-medium">{formatCurrency(rule?.fixedAmount ?? 0)}</td>
                        )}
                        {account.allocationMethod === "meter" && (
                          <>
                            <td className="px-4 py-3 text-muted-foreground">{rule?.previousReading ?? 0}</td>
                            <td className="px-4 py-3 text-muted-foreground">{rule?.currentReading ?? 0}</td>
                          </>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Billing history / distributions */}
      <Card>
        <CardContent className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-base font-semibold">Billing History ({accountDistributions.length})</h3>
            <Button size="sm" onClick={() => setBillDialogOpen(true)}>
              <Zap className="mr-1 h-3.5 w-3.5" /> Enter New Bill
            </Button>
          </div>
          {accountDistributions.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No bills entered yet. Click "Enter New Bill" to log a monthly EWA bill and distribute it across units.
            </p>
          ) : (
            <div className="space-y-4">
              {accountDistributions
                .slice()
                .sort((a, b) => b.month.localeCompare(a.month))
                .map((d) => {
                  const allocatedToTenants = d.allocations.filter((a) => !a.excluded && !a.chargeToLandlord);
                  const landlordShare = d.allocations.filter((a) => a.chargeToLandlord);
                  const excluded = d.allocations.filter((a) => a.excluded);
                  return (
                    <div key={d.id} className="rounded-lg border p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
                            <Calendar className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="font-semibold">{d.billNumber}</p>
                            <p className="text-xs text-muted-foreground">{d.month} · Due {d.dueDate}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <StatusBadge status={d.status} />
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:bg-red-50"
                            onClick={() => setDeletingDist(d)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>

                      <div className="mt-3 grid gap-3 sm:grid-cols-4">
                        <div className="rounded-md bg-muted/40 p-3">
                          <p className="text-xs text-muted-foreground">Total Bill</p>
                          <p className="font-bold">{formatCurrency(d.totalAmount)}</p>
                        </div>
                        <div className="rounded-md bg-emerald-50 p-3">
                          <p className="text-xs text-muted-foreground">Allocated to Tenants</p>
                          <p className="font-bold text-emerald-700">{formatCurrency(d.allocatedAmount)}</p>
                        </div>
                        <div className="rounded-md bg-amber-50 p-3">
                          <p className="text-xs text-muted-foreground">Landlord Share</p>
                          <p className="font-bold text-amber-700">
                            {formatCurrency(d.allocations.reduce((s, a) => s + (a.chargeToLandlord ? a.amount : 0), 0))}
                          </p>
                        </div>
                        <div className="rounded-md bg-muted/40 p-3">
                          <p className="text-xs text-muted-foreground">Remaining</p>
                          <p className="font-bold">{formatCurrency(d.remainingBalance)}</p>
                        </div>
                      </div>

                      {/* Per-unit breakdown */}
                      <div className="mt-3 overflow-x-auto rounded-lg border">
                        <table className="w-full text-xs">
                          <thead className="bg-muted/40 text-muted-foreground">
                            <tr>
                              <th className="px-3 py-2 text-left font-medium">Unit</th>
                              <th className="px-3 py-2 text-left font-medium">Tenant</th>
                              <th className="px-3 py-2 text-right font-medium">Share</th>
                              <th className="px-3 py-2 text-left font-medium">Status</th>
                              <th className="px-3 py-2 text-left font-medium">EWA Bill</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {d.allocations.map((a) => {
                              const u = units.find((x) => x.id === a.unitId);
                              const t = a.tenantId ? tenants.find((x) => x.id === a.tenantId) : undefined;
                              const bill = a.ewaBillId ? ewaBills.find((b) => b.id === a.ewaBillId) : undefined;
                              return (
                                <tr key={a.unitId}>
                                  <td className="px-3 py-2 font-medium">{u?.unitNumber ?? a.unitId}</td>
                                  <td className="px-3 py-2 text-muted-foreground">
                                    {t ? t.name : a.excluded ? "Excluded (vacant)" : a.chargeToLandlord ? "Landlord" : "—"}
                                  </td>
                                  <td className="px-3 py-2 text-right font-medium">
                                    {a.excluded ? "—" : formatCurrency(a.amount)}
                                  </td>
                                  <td className="px-3 py-2">
                                    {a.excluded ? (
                                      <span className="text-muted-foreground">Excluded</span>
                                    ) : a.chargeToLandlord ? (
                                      <span className="text-amber-600">Landlord</span>
                                    ) : bill ? (
                                      <StatusBadge status={bill.status} />
                                    ) : d.status === "Distributed" ? (
                                      <span className="text-muted-foreground">No lease</span>
                                    ) : (
                                      <span className="text-muted-foreground">Pending</span>
                                    )}
                                  </td>
                                  <td className="px-3 py-2">
                                    {bill ? (
                                      <Link to={`/ewa-bills/${bill.id}`} className="text-primary hover:underline">
                                        {bill.billNumber}
                                      </Link>
                                    ) : (
                                      <span className="text-muted-foreground">—</span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      {d.notes && <p className="mt-2 text-xs text-muted-foreground">Notes: {d.notes}</p>}

                      {/* Actions */}
                      <div className="mt-3 flex flex-wrap gap-2">
                        {d.status !== "Distributed" && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => processEWADistribution(d.id)}
                            >
                              <Send className="mr-1 h-3.5 w-3.5" /> Process & Create Per-Unit Bills
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => recalculateEWADistribution(d.id)}
                            >
                              <RefreshCw className="mr-1 h-3.5 w-3.5" /> Recalculate
                            </Button>
                          </>
                        )}
                        {d.status === "Distributed" && (
                          <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
                            <Users className="h-3.5 w-3.5" /> {allocatedToTenants.length} tenant bill(s) created · {landlordShare.length} landlord · {excluded.length} excluded
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit EWA Account</DialogTitle>
            <DialogDescription>Update the account, linked units, and allocation rules.</DialogDescription>
          </DialogHeader>
          <EWAAccountForm initialData={account} onClose={() => setEditOpen(false)} />
        </DialogContent>
      </Dialog>

      {/* Bill entry dialog */}
      <Dialog open={billDialogOpen} onOpenChange={setBillDialogOpen}>
        <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Enter Monthly EWA Bill</DialogTitle>
            <DialogDescription>
              Enter the total bill amount for this shared account. The system will automatically split it across the {linkedUnits.length} linked unit(s) using the {methodLabels[account.allocationMethod].toLowerCase()} method.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submitBill} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="month">Billing Month *</Label>
                <Input
                  id="month"
                  type="month"
                  value={billForm.month}
                  onChange={(e) => setBillForm((p) => ({ ...p, month: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="totalAmount">Total Bill Amount (BHD) *</Label>
                <Input
                  id="totalAmount"
                  type="number"
                  step="0.001"
                  value={billForm.totalAmount}
                  onChange={(e) => setBillForm((p) => ({ ...p, totalAmount: Number(e.target.value) }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dueDate">Due Date *</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={billForm.dueDate}
                  onChange={(e) => setBillForm((p) => ({ ...p, dueDate: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes (optional)</Label>
                <Input
                  id="notes"
                  value={billForm.notes}
                  onChange={(e) => setBillForm((p) => ({ ...p, notes: e.target.value }))}
                />
              </div>
            </div>

            {billError && <p className="text-xs text-red-500">{billError}</p>}

            {/* Live preview */}
            {preview && Number(billForm.totalAmount) > 0 && (
              <div className="rounded-lg border bg-muted/30 p-4">
                <p className="mb-3 text-sm font-semibold flex items-center gap-2">
                  <Calculator className="h-4 w-4" /> Allocation Preview
                </p>
                {preview.warnings.length > 0 && (
                  <div className="mb-2 rounded-md bg-amber-50 p-2 text-xs text-amber-700">
                    {preview.warnings.map((w, i) => (
                      <p key={i}>• {w}</p>
                    ))}
                  </div>
                )}
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Allocated to tenants</span>
                    <span className="font-medium text-emerald-600">{formatCurrency(preview.allocatedAmount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Charged to landlord</span>
                    <span className="font-medium text-amber-600">{formatCurrency(preview.landlordAmount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Excluded (vacant)</span>
                    <span className="font-medium">{formatCurrency(preview.unallocatedAmount)}</span>
                  </div>
                  <div className="mt-2 flex justify-between border-t pt-2">
                    <span className="font-medium">Total</span>
                    <span className="font-bold">{formatCurrency(preview.remainingBalance)}</span>
                  </div>
                </div>
                <div className="mt-3 max-h-40 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="text-muted-foreground">
                      <tr>
                        <th className="px-2 py-1 text-left font-medium">Unit</th>
                        <th className="px-2 py-1 text-left font-medium">Tenant</th>
                        <th className="px-2 py-1 text-right font-medium">Share</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.allocations.map((a) => {
                        const u = units.find((x) => x.id === a.unitId);
                        const t = a.tenantId ? tenants.find((x) => x.id === a.tenantId) : undefined;
                        return (
                          <tr key={a.unitId} className="border-t">
                            <td className="px-2 py-1">{u?.unitNumber ?? a.unitId}</td>
                            <td className="px-2 py-1 text-muted-foreground">
                              {t ? t.name : a.excluded ? "Excluded" : a.chargeToLandlord ? "Landlord" : "—"}
                            </td>
                            <td className="px-2 py-1 text-right font-medium">
                              {a.excluded ? "—" : formatCurrency(a.amount)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setBillDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Create Distribution</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog
        open={Boolean(deletingDist)}
        onOpenChange={(o) => !o && setDeletingDist(undefined)}
        itemName={deletingDist?.billNumber}
        onConfirm={() => deletingDist && deleteEWADistribution(deletingDist.id)}
      />

      <DeleteConfirmDialog
        open={deletingAccount}
        onOpenChange={setDeletingAccount}
        itemName={`${account.accountNumber}${account.nickname ? ` (${account.nickname})` : ""}`}
        onConfirm={() => {
          deleteEWAAccount(account.id);
          navigate("/ewa-accounts");
        }}
      />
    </div>
  );
}
