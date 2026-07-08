import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useData } from "@/context/DataContext";
import ExpenseForm from "@/components/forms/ExpenseForm";
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog";
import { Search, Pencil, Eye, Calendar, Clock, Receipt, Trash2 } from "lucide-react";
import { format, isSameMonth, parseISO } from "date-fns";
import type { Expense } from "@/types";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-BH", { style: "currency", currency: "BHD", maximumFractionDigits: 2 }).format(amount);
}

const expenseCategories = ["All Categories", "Maintenance", "Cleaning", "Utilities", "Security", "Insurance", "Repair", "Marketing", "Management", "Other"];

export default function Expenses() {
  const navigate = useNavigate();
  const { expenses, buildings, units, getBuildingById, deleteExpense } = useData();
  const [search, setSearch] = useState("");
  const [buildingFilter, setBuildingFilter] = useState<string>("All Buildings");
  const [categoryFilter, setCategoryFilter] = useState<string>("All Categories");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | undefined>();
  const [deletingExpense, setDeletingExpense] = useState<Expense | undefined>();

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const thisMonthTotal = expenses
    .filter((e) => isSameMonth(parseISO(e.expenseDate), new Date()))
    .reduce((sum, e) => sum + e.amount, 0);
  const pendingTotal = expenses.filter((e) => e.status === "Pending").reduce((sum, e) => sum + e.amount, 0);

  const filtered = useMemo(() => {
    return expenses.filter((e) => {
      const matchesSearch =
        e.expenseNumber.toLowerCase().includes(search.toLowerCase()) ||
        e.vendor.toLowerCase().includes(search.toLowerCase()) ||
        e.category.toLowerCase().includes(search.toLowerCase());
      const matchesBuilding = buildingFilter === "All Buildings" || e.buildingId === buildingFilter;
      const matchesCategory = categoryFilter === "All Categories" || e.category === categoryFilter;
      const matchesStatus = statusFilter === "All" || e.status === statusFilter;
      return matchesSearch && matchesBuilding && matchesCategory && matchesStatus;
    });
  }, [search, buildingFilter, categoryFilter, statusFilter, expenses]);

  const openAdd = () => {
    setEditingExpense(undefined);
    setDialogOpen(true);
  };

  const openEdit = (expense: Expense) => {
    setEditingExpense(expense);
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingExpense(undefined);
  };

  const linkedTo = (expense: Expense) => {
    if (expense.unitId) {
      const unit = units.find((u) => u.id === expense.unitId);
      const building = unit ? getBuildingById(unit.buildingId) : undefined;
      return `${building?.name ?? ""} — ${unit?.unitNumber ?? ""}`;
    }
    if (expense.buildingId) {
      return getBuildingById(expense.buildingId)?.name ?? "—";
    }
    return "General";
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Expenses"
        subtitle={`${expenses.length} expense(s) recorded`}
        action={{ label: "Add Expense", onClick: openAdd }}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-sm font-medium text-muted-foreground">This Month</p>
              <p className="mt-2 text-2xl font-bold text-foreground">{formatCurrency(thisMonthTotal)}</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
              <Calendar className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Pending</p>
              <p className="mt-2 text-2xl font-bold text-orange-600">{formatCurrency(pendingTotal)}</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100 text-orange-600">
              <Clock className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Recorded</p>
              <p className="mt-2 text-2xl font-bold text-foreground">{formatCurrency(totalExpenses)}</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
              <Receipt className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search expense number or reference..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <select
          value={buildingFilter}
          onChange={(e) => setBuildingFilter(e.target.value)}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground"
        >
          <option value="All Buildings">All Buildings</option>
          {buildings.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground"
        >
          {expenseCategories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground"
        >
          <option value="All">All Statuses</option>
          <option value="Pending">Pending</option>
          <option value="Approved">Approved</option>
          <option value="Paid">Paid</option>
          <option value="Rejected">Rejected</option>
        </select>
      </div>

      <Card>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Expense #</th>
                <th className="px-4 py-3 text-left font-medium">Date</th>
                <th className="px-4 py-3 text-left font-medium">Category</th>
                <th className="px-4 py-3 text-left font-medium">Linked To</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-left font-medium">Amount</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                    No expenses found.
                  </td>
                </tr>
              ) : (
                filtered.map((e) => (
                  <tr key={e.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">{e.expenseNumber}</td>
                    <td className="px-4 py-3">{format(new Date(e.expenseDate), "dd/MM/yyyy")}</td>
                    <td className="px-4 py-3">{e.category}</td>
                    <td className="px-4 py-3 text-muted-foreground">{linkedTo(e)}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={e.status} />
                    </td>
                    <td className="px-4 py-3">{formatCurrency(e.amount)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => navigate(`/expenses/${e.id}`)}>
                          <Eye className="mr-1 h-3.5 w-3.5" /> View
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => openEdit(e)}>
                          <Pencil className="mr-1 h-3.5 w-3.5" /> Edit
                        </Button>
                        <Button variant="ghost" size="sm" className="text-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => setDeletingExpense(e)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <DeleteConfirmDialog
        open={Boolean(deletingExpense)}
        onOpenChange={(o) => !o && setDeletingExpense(undefined)}
        itemName={deletingExpense?.expenseNumber}
        onConfirm={() => deletingExpense && deleteExpense(deletingExpense.id)}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingExpense ? "Edit Expense" : "Add Expense"}</DialogTitle>
            <DialogDescription>Fill in the expense details below.</DialogDescription>
          </DialogHeader>
          <ExpenseForm initialData={editingExpense} onClose={closeDialog} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
