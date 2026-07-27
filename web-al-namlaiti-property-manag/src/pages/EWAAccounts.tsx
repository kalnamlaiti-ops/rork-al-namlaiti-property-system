import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog";
import { useData } from "@/context/DataContext";
import EWAAccountForm from "@/components/forms/EWAAccountForm";
import { Search, Pencil, Eye, Zap, Building2, Plus, Trash2, Link2 } from "lucide-react";
import type { EWAAccount } from "@/types";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-BH", { style: "currency", currency: "BHD", maximumFractionDigits: 2 }).format(amount);
}

const methodLabels: Record<EWAAccount["allocationMethod"], string> = {
  equal: "Equal Split",
  percentage: "Percentage",
  fixed: "Fixed Amount",
  meter: "Sub-Meter",
};

export default function EWAAccounts() {
  const navigate = useNavigate();
  const {
    ewaAccounts,
    ewaDistributions,
    getBuildingById,
    units,
    deleteEWAAccount,
  } = useData();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<EWAAccount | undefined>();
  const [deletingAccount, setDeletingAccount] = useState<EWAAccount | undefined>();

  const totalAccounts = ewaAccounts.length;
  const activeAccounts = ewaAccounts.filter((a) => a.status === "Active").length;
  const totalLinkedUnits = ewaAccounts.reduce((sum, a) => sum + a.linkedUnitIds.length, 0);
  const totalBilled = ewaDistributions.reduce((sum, d) => sum + d.totalAmount, 0);

  const filtered = useMemo(() => {
    return ewaAccounts.filter((a) => {
      const building = getBuildingById(a.buildingId);
      const matchesSearch =
        a.accountNumber.toLowerCase().includes(search.toLowerCase()) ||
        (a.nickname ?? "").toLowerCase().includes(search.toLowerCase()) ||
        (building?.name ?? "").toLowerCase().includes(search.toLowerCase());
      return matchesSearch;
    });
  }, [search, ewaAccounts, getBuildingById]);

  const openAdd = () => {
    setEditingAccount(undefined);
    setDialogOpen(true);
  };

  const openEdit = (account: EWAAccount) => {
    setEditingAccount(account);
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingAccount(undefined);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="EWA Accounts"
        subtitle="Shared electricity & water meters distributed across units"
        action={{ label: "Add EWA Account", onClick: openAdd }}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Accounts</p>
              <p className="mt-2 text-2xl font-bold text-foreground">{totalAccounts}</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
              <Zap className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Active</p>
              <p className="mt-2 text-2xl font-bold text-emerald-600">{activeAccounts}</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
              <Link2 className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Linked Units</p>
              <p className="mt-2 text-2xl font-bold text-foreground">{totalLinkedUnits}</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
              <Building2 className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Billed</p>
              <p className="mt-2 text-2xl font-bold text-foreground">{formatCurrency(totalBilled)}</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
              <Zap className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search account number, nickname, building..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <Card>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Account Number</th>
                <th className="px-4 py-3 text-left font-medium">Building</th>
                <th className="px-4 py-3 text-left font-medium">Method</th>
                <th className="px-4 py-3 text-left font-medium">Linked Units</th>
                <th className="px-4 py-3 text-left font-medium">Vacant Handling</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                    No EWA accounts yet. Click "Add EWA Account" to create a shared meter.
                  </td>
                </tr>
              ) : (
                filtered.map((a) => {
                  const building = getBuildingById(a.buildingId);
                  const occupiedCount = a.linkedUnitIds.filter((uid) => {
                    const u = units.find((x) => x.id === uid);
                    return u && u.status === "Occupied";
                  }).length;
                  return (
                    <tr key={a.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <div className="font-medium">{a.accountNumber}</div>
                        {a.nickname && (
                          <div className="text-xs text-muted-foreground">{a.nickname}</div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {building ? (
                          <span className="text-foreground">{building.name}</span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                          {methodLabels[a.allocationMethod]}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-medium">{a.linkedUnitIds.length}</span>
                        <span className="text-xs text-muted-foreground"> ({occupiedCount} occupied)</span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground capitalize">
                        {a.vacantAction}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={a.status} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm" onClick={() => navigate(`/ewa-accounts/${a.id}`)}>
                            <Eye className="mr-1 h-3.5 w-3.5" /> View
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => openEdit(a)}>
                            <Pencil className="mr-1 h-3.5 w-3.5" /> Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:bg-red-50 hover:text-red-700"
                            onClick={() => setDeletingAccount(a)}
                          >
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
        open={Boolean(deletingAccount)}
        onOpenChange={(o) => !o && setDeletingAccount(undefined)}
        itemName={deletingAccount ? `${deletingAccount.accountNumber}${deletingAccount.nickname ? ` (${deletingAccount.nickname})` : ""}` : undefined}
        onConfirm={() => deletingAccount && deleteEWAAccount(deletingAccount.id)}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingAccount ? "Edit EWA Account" : "Add EWA Account"}</DialogTitle>
            <DialogDescription>
              Configure a shared EWA meter and how its monthly bill is split across units.
            </DialogDescription>
          </DialogHeader>
          <EWAAccountForm initialData={editingAccount} onClose={closeDialog} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
