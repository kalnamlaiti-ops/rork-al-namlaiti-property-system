import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useData } from "@/context/DataContext";
import EWABillForm from "@/components/forms/EWABillForm";
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog";
import { Search, Pencil, Eye, Zap, TriangleAlert, FileText, Trash2 } from "lucide-react";
import { format } from "date-fns";
import type { EWABill } from "@/types";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-BH", { style: "currency", currency: "BHD", maximumFractionDigits: 2 }).format(amount);
}

export default function EWABills() {
  const navigate = useNavigate();
  const { ewaBills, leases, units, getBuildingById, updateEWABill, deleteEWABill } = useData();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBill, setEditingBill] = useState<EWABill | undefined>();
  const [deletingBill, setDeletingBill] = useState<EWABill | undefined>();

  const totalBilled = ewaBills.reduce((sum, b) => sum + b.billAmount, 0);
  const pendingExcess = ewaBills.filter((b) => b.status === "Pending").reduce((sum, b) => sum + b.excess, 0);

  const filtered = useMemo(() => {
    return ewaBills.filter((b) => {
      const lease = leases.find((l) => l.id === b.leaseId);
      const unit = units.find((u) => u.id === b.unitId);
      const building = getBuildingById(b.buildingId);
      const matchesSearch =
        b.billNumber.toLowerCase().includes(search.toLowerCase()) ||
        (lease?.contractNumber ?? "").toLowerCase().includes(search.toLowerCase()) ||
        (unit?.unitNumber ?? "").toLowerCase().includes(search.toLowerCase()) ||
        (building?.name ?? "").toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === "All" || b.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [search, statusFilter, ewaBills, leases, units, getBuildingById]);

  const openAdd = () => {
    setEditingBill(undefined);
    setDialogOpen(true);
  };

  const openEdit = (bill: EWABill) => {
    setEditingBill(bill);
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingBill(undefined);
  };

  const handleInvoice = (bill: EWABill) => {
    updateEWABill(bill.id, { status: "Invoiced" });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="EWA Bills"
        subtitle={`${ewaBills.length} bill(s) recorded`}
        action={{ label: "Log EWA Bill", onClick: openAdd }}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Billed</p>
              <p className="mt-2 text-2xl font-bold text-foreground">{formatCurrency(totalBilled)}</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
              <FileText className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Pending Excess to Charge</p>
              <p className="mt-2 text-2xl font-bold text-orange-600">{formatCurrency(pendingExcess)}</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100 text-red-600">
              <TriangleAlert className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search bill number, lease, unit..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground"
        >
          <option value="All">All Statuses</option>
          <option value="Pending">Pending</option>
          <option value="Invoiced">Invoiced</option>
          <option value="Paid">Paid</option>
        </select>
      </div>

      <Card>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Lease</th>
                <th className="px-4 py-3 text-left font-medium">Unit</th>
                <th className="px-4 py-3 text-left font-medium">Month</th>
                <th className="px-4 py-3 text-left font-medium">Bill</th>
                <th className="px-4 py-3 text-left font-medium">Limit</th>
                <th className="px-4 py-3 text-left font-medium">Excess</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                    No EWA bills logged.
                  </td>
                </tr>
              ) : (
                filtered.map((b) => {
                  const lease = leases.find((l) => l.id === b.leaseId);
                  const unit = units.find((u) => u.id === b.unitId);
                  return (
                    <tr key={b.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3 font-medium">{lease?.contractNumber}</td>
                      <td className="px-4 py-3">{unit?.unitNumber}</td>
                      <td className="px-4 py-3">{b.month}</td>
                      <td className="px-4 py-3">{formatCurrency(b.billAmount)}</td>
                      <td className="px-4 py-3 text-muted-foreground">{formatCurrency(b.limit)}</td>
                      <td className="px-4 py-3 font-medium text-orange-600">{formatCurrency(b.excess)}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={b.status} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm" onClick={() => navigate(`/ewa-bills/${b.id}`)}>
                            <Eye className="mr-1 h-3.5 w-3.5" /> View
                          </Button>
                          {b.status === "Pending" && b.excess > 0 && (
                            <Button variant="outline" size="sm" onClick={() => handleInvoice(b)}>
                              <Zap className="mr-1 h-3.5 w-3.5" /> Invoice
                            </Button>
                          )}
                          <Button variant="ghost" size="sm" onClick={() => openEdit(b)}>
                            <Pencil className="mr-1 h-3.5 w-3.5" /> Edit
                          </Button>
                          <Button variant="ghost" size="sm" className="text-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => setDeletingBill(b)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <DeleteConfirmDialog
        open={Boolean(deletingBill)}
        onOpenChange={(o) => !o && setDeletingBill(undefined)}
        itemName={deletingBill?.billNumber}
        onConfirm={() => deletingBill && deleteEWABill(deletingBill.id)}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingBill ? "Edit EWA Bill" : "Log EWA Bill"}</DialogTitle>
            <DialogDescription>Record the EWA bill and lease limit to calculate excess charges.</DialogDescription>
          </DialogHeader>
          <EWABillForm initialData={editingBill} onClose={closeDialog} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
