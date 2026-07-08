import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useData } from "@/context/DataContext";
import PaymentForm from "@/components/forms/PaymentForm";
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog";
import { Search, Pencil, Wallet, Calendar, Banknote, Landmark, Trash2 } from "lucide-react";
import { format, isSameMonth, parseISO } from "date-fns";
import type { Payment } from "@/types";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-BH", { style: "currency", currency: "BHD", maximumFractionDigits: 2 }).format(amount);
}

export default function Payments() {
  const navigate = useNavigate();
  const { payments, invoices, getTenantById, deletePayment } = useData();
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Payment | undefined>();
  const [deletingPayment, setDeletingPayment] = useState<Payment | undefined>();

  const totalPayments = payments.reduce((sum, p) => sum + p.amount, 0);
  const thisMonthTotal = payments
    .filter((p) => isSameMonth(parseISO(p.paymentDate), new Date()))
    .reduce((sum, p) => sum + p.amount, 0);
  const cashTotal = payments.filter((p) => p.method === "Cash").reduce((sum, p) => sum + p.amount, 0);
  const chequeTotal = payments.filter((p) => p.method === "Cheque").reduce((sum, p) => sum + p.amount, 0);

  const filtered = useMemo(() => {
    return payments.filter((p) => {
      const tenant = getTenantById(p.tenantId);
      const invoice = invoices.find((i) => i.id === p.invoiceId);
      const matchesSearch =
        p.receiptNumber.toLowerCase().includes(search.toLowerCase()) ||
        (tenant?.name ?? "").toLowerCase().includes(search.toLowerCase()) ||
        (invoice?.invoiceNumber ?? "").toLowerCase().includes(search.toLowerCase());
      const matchesDateFrom = !dateFrom || p.paymentDate >= dateFrom;
      const matchesDateTo = !dateTo || p.paymentDate <= dateTo;
      return matchesSearch && matchesDateFrom && matchesDateTo;
    });
  }, [search, dateFrom, dateTo, payments, invoices, getTenantById]);

  const openAdd = () => {
    setEditingPayment(undefined);
    setDialogOpen(true);
  };

  const openEdit = (payment: Payment) => {
    setEditingPayment(payment);
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingPayment(undefined);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payments"
        subtitle={`${payments.length} payment(s) recorded`}
        action={{ label: "Record Payment", onClick: openAdd }}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Collected</p>
              <p className="mt-2 text-2xl font-bold text-emerald-600">{formatCurrency(totalPayments)}</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
              <Wallet className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
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
              <p className="text-sm font-medium text-muted-foreground">Cash</p>
              <p className="mt-2 text-2xl font-bold text-foreground">{formatCurrency(cashTotal)}</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
              <Banknote className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Cheque</p>
              <p className="mt-2 text-2xl font-bold text-foreground">{formatCurrency(chequeTotal)}</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 text-purple-600">
              <Landmark className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search payment number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="h-10 lg:w-40"
          placeholder="From"
        />
        <Input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="h-10 lg:w-40"
          placeholder="To"
        />
      </div>

      <Card>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Payment #</th>
                <th className="px-4 py-3 text-left font-medium">Date</th>
                <th className="px-4 py-3 text-left font-medium">Tenant</th>
                <th className="px-4 py-3 text-left font-medium">Invoice</th>
                <th className="px-4 py-3 text-left font-medium">Method</th>
                <th className="px-4 py-3 text-left font-medium">Amount</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                    No payments found.
                  </td>
                </tr>
              ) : (
                filtered.map((p) => {
                  const tenant = getTenantById(p.tenantId);
                  const invoice = invoices.find((i) => i.id === p.invoiceId);
                  return (
                    <tr key={p.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3 font-medium">{p.receiptNumber}</td>
                      <td className="px-4 py-3">{format(new Date(p.paymentDate), "dd/MM/yyyy")}</td>
                      <td className="px-4 py-3">{tenant?.name}</td>
                      <td className="px-4 py-3 text-indigo-600">{invoice?.invoiceNumber}</td>
                      <td className="px-4 py-3">{p.method}</td>
                      <td className="px-4 py-3 font-medium text-emerald-600">{formatCurrency(p.amount)}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm" onClick={() => navigate(`/payments/${p.id}`)}>
                            View
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => openEdit(p)}>
                            <Pencil className="mr-1 h-3.5 w-3.5" /> Edit
                          </Button>
                          <Button variant="ghost" size="sm" className="text-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => setDeletingPayment(p)}>
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
        open={Boolean(deletingPayment)}
        onOpenChange={(o) => !o && setDeletingPayment(undefined)}
        itemName={deletingPayment?.receiptNumber}
        onConfirm={() => deletingPayment && deletePayment(deletingPayment.id)}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingPayment ? "Edit Payment" : "Record Payment"}</DialogTitle>
            <DialogDescription>Fill in the payment details below.</DialogDescription>
          </DialogHeader>
          <PaymentForm initialData={editingPayment} onClose={closeDialog} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
