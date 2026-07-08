import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useData } from "@/context/DataContext";
import ChartOfAccountForm from "@/components/forms/ChartOfAccountForm";
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog";
import { Search, Pencil, Eye, Trash2 } from "lucide-react";
import type { ChartOfAccount } from "@/types";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-BH", { style: "currency", currency: "BHD", maximumFractionDigits: 0 }).format(amount);
}

const typeColors: Record<string, string> = {
  Asset: "bg-blue-100 text-blue-700",
  Liability: "bg-amber-100 text-amber-700",
  Equity: "bg-purple-100 text-purple-700",
  Income: "bg-emerald-100 text-emerald-700",
  Expense: "bg-red-100 text-red-700",
};

export default function ChartOfAccounts() {
  const navigate = useNavigate();
  const { chartOfAccounts, getChartOfAccountById, deleteChartOfAccount } = useData();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<ChartOfAccount | undefined>();
  const [deletingAccount, setDeletingAccount] = useState<ChartOfAccount | undefined>();

  const filtered = useMemo(() => {
    return chartOfAccounts.filter((a) =>
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.code.toLowerCase().includes(search.toLowerCase()) ||
      a.type.toLowerCase().includes(search.toLowerCase())
    );
  }, [search, chartOfAccounts]);

  const openAdd = () => {
    setEditingAccount(undefined);
    setDialogOpen(true);
  };

  const openEdit = (account: ChartOfAccount) => {
    setEditingAccount(account);
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingAccount(undefined);
  };

  const viewAccount = (id: string) => {
    navigate(`/chart-of-accounts/${id}`);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Chart of Accounts"
        subtitle={`${chartOfAccounts.length} account(s)`}
        action={{ label: "Add Account", onClick: openAdd }}
      />

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search account name or code..."
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
                <th className="px-4 py-3 text-left font-medium">Code</th>
                <th className="px-4 py-3 text-left font-medium">Name</th>
                <th className="px-4 py-3 text-left font-medium">Type</th>
                <th className="px-4 py-3 text-right font-medium">Balance</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((a) => (
                <tr key={a.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium">{a.code}</td>
                  <td className="px-4 py-3">{a.name}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${typeColors[a.type]}`}>
                      {a.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-medium">{formatCurrency(a.balance)}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={() => viewAccount(a.id)}>
                        <Eye className="mr-1 h-3.5 w-3.5" /> View
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => openEdit(a)}>
                        <Pencil className="mr-1 h-3.5 w-3.5" /> Edit
                      </Button>
                      <Button variant="ghost" size="sm" className="text-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => setDeletingAccount(a)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <DeleteConfirmDialog
        open={Boolean(deletingAccount)}
        onOpenChange={(o) => !o && setDeletingAccount(undefined)}
        itemName={deletingAccount?.name}
        onConfirm={() => deletingAccount && deleteChartOfAccount(deletingAccount.id)}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingAccount ? "Edit Account" : "New Account"}</DialogTitle>
            <DialogDescription>Fill in the account details below.</DialogDescription>
          </DialogHeader>
          <ChartOfAccountForm initialData={editingAccount} onClose={closeDialog} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
