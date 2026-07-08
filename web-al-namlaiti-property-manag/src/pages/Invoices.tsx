import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useData } from "@/context/DataContext";
import InvoiceForm from "@/components/forms/InvoiceForm";
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog";
import {
  Search,
  Pencil,
  Trash2,
  Send,
  Download,
  Eye,
  CheckCircle,
  Zap,
  Mail,
  Loader2,
} from "lucide-react";
import { format } from "date-fns";
import type { Invoice } from "@/types";
import { downloadInvoicePdf } from "@/lib/pdfGenerator";
import { toPeriodKey } from "@/lib/invoiceGenerator";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-BH", { style: "currency", currency: "BHD", maximumFractionDigits: 0 }).format(amount);
}

export default function Invoices() {
  const navigate = useNavigate();
  const {
    invoices,
    buildings,
    tenants,
    getTenantById,
    getUnitById,
    getBuildingById,
    deleteInvoice,
    generateMonthlyInvoices,
    sendInvoice,
    sendAllInvoices,
    markInvoicePaid,
    voidInvoice,
    buildPdfContext,
  } = useData();

  const [search, setSearch] = useState("");
  const [buildingFilter, setBuildingFilter] = useState<string>("All");
  const [tenantFilter, setTenantFilter] = useState<string>("All");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | undefined>();
  const [deletingInvoice, setDeletingInvoice] = useState<Invoice | undefined>();
  const [generating, setGenerating] = useState(false);
  const [sendingAll, setSendingAll] = useState(false);
  const [busyInvoiceId, setBusyInvoiceId] = useState<string | null>(null);

  const totalBilled = invoices.reduce((sum, i) => sum + i.amount, 0);
  const totalCollected = totalBilled - invoices.reduce((sum, i) => sum + i.balance, 0);
  const outstanding = invoices.reduce((sum, i) => sum + i.balance, 0);
  const overdueCount = invoices.filter((i) => i.status === "Overdue").length;

  const filtered = useMemo(() => {
    return invoices.filter((i) => {
      const tenant = getTenantById(i.tenantId);
      const unit = getUnitById(i.unitId);
      const building = unit ? getBuildingById(unit.buildingId) : undefined;
      const matchesSearch =
        i.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
        (tenant?.name ?? "").toLowerCase().includes(search.toLowerCase());
      const matchesBuilding = buildingFilter === "All" || building?.id === buildingFilter;
      const matchesTenant = tenantFilter === "All" || i.tenantId === tenantFilter;
      const matchesStatus = statusFilter === "All" || i.status === statusFilter;
      const invoiceDate = i.issueDate ?? i.dueDate;
      const matchesDateFrom = !dateFrom || invoiceDate >= dateFrom;
      const matchesDateTo = !dateTo || invoiceDate <= dateTo;
      return matchesSearch && matchesBuilding && matchesTenant && matchesStatus && matchesDateFrom && matchesDateTo;
    });
  }, [search, buildingFilter, tenantFilter, statusFilter, dateFrom, dateTo, invoices, getTenantById, getUnitById, getBuildingById]);

  const openAdd = () => {
    setEditingInvoice(undefined);
    setDialogOpen(true);
  };

  const openEdit = (invoice: Invoice) => {
    setEditingInvoice(invoice);
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingInvoice(undefined);
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      await generateMonthlyInvoices(toPeriodKey(new Date()));
    } finally {
      setGenerating(false);
    }
  };

  const handleSendAll = async () => {
    setSendingAll(true);
    try {
      await sendAllInvoices((i) => i.status === "Draft" || i.status === "Sent");
    } finally {
      setSendingAll(false);
    }
  };

  const handleSend = async (invoice: Invoice) => {
    setBusyInvoiceId(invoice.id);
    try {
      await sendInvoice(invoice.id);
    } finally {
      setBusyInvoiceId(null);
    }
  };

  const handleDownload = (invoice: Invoice) => {
    const ctx = buildPdfContext(invoice);
    downloadInvoicePdf(ctx);
  };

  const handleMarkPaid = (invoice: Invoice) => {
    markInvoicePaid(invoice.id);
  };

  const handleVoid = (invoice: Invoice) => {
    voidInvoice(invoice.id);
  };

  const clearFilters = () => {
    setBuildingFilter("All");
    setTenantFilter("All");
    setStatusFilter("All");
    setDateFrom("");
    setDateTo("");
    setSearch("");
  };

  const hasActiveFilters = buildingFilter !== "All" || tenantFilter !== "All" || statusFilter !== "All" || dateFrom || dateTo || search;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Invoices"
        subtitle={`${invoices.length} invoice(s)`}
        action={{ label: "Create Invoice", onClick: openAdd }}
      />

      {/* Automation toolbar */}
      <div className="flex flex-wrap gap-3">
        <Button onClick={handleGenerate} disabled={generating} variant="default">
          {generating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Zap className="mr-2 h-4 w-4" />}
          {generating ? "Generating..." : "Generate Monthly Invoices"}
        </Button>
        <Button onClick={handleSendAll} disabled={sendingAll} variant="outline">
          {sendingAll ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}
          {sendingAll ? "Sending..." : "Send All Drafts"}
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-5">
            <p className="text-sm font-medium text-muted-foreground">Total Billed</p>
            <p className="mt-2 text-2xl font-bold text-foreground">{formatCurrency(totalBilled)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm font-medium text-muted-foreground">Total Collected</p>
            <p className="mt-2 text-2xl font-bold text-emerald-600">{formatCurrency(totalCollected)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm font-medium text-muted-foreground">Outstanding</p>
            <p className="mt-2 text-2xl font-bold text-orange-600">{formatCurrency(outstanding)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm font-medium text-muted-foreground">Overdue Invoices</p>
            <p className="mt-2 text-2xl font-bold text-red-600">{overdueCount}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search invoice number or tenant..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <select
            value={buildingFilter}
            onChange={(e) => setBuildingFilter(e.target.value)}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground"
          >
            <option value="All">All Buildings</option>
            {buildings.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
          <select
            value={tenantFilter}
            onChange={(e) => setTenantFilter(e.target.value)}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground"
          >
            <option value="All">All Tenants</option>
            {tenants.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground"
          >
            <option value="All">All Statuses</option>
            <option value="Draft">Draft</option>
            <option value="Sent">Sent</option>
            <option value="Partial">Partial</option>
            <option value="Paid">Paid</option>
            <option value="Overdue">Overdue</option>
            <option value="Cancelled">Cancelled</option>
          </select>
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-10 w-auto" placeholder="From" />
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-10 w-auto" placeholder="To" />
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>Clear</Button>
          )}
        </div>
      </div>

      <Card>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Invoice #</th>
                <th className="px-4 py-3 text-left font-medium">Tenant</th>
                <th className="px-4 py-3 text-left font-medium">Unit</th>
                <th className="px-4 py-3 text-left font-medium">Due Date</th>
                <th className="px-4 py-3 text-left font-medium">Amount</th>
                <th className="px-4 py-3 text-left font-medium">Balance</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-left font-medium">Email</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">
                    No invoices found. Click "Generate Monthly Invoices" to auto-create them.
                  </td>
                </tr>
              ) : (
                filtered.map((i) => {
                  const tenant = getTenantById(i.tenantId);
                  const unit = getUnitById(i.unitId);
                  const building = unit ? getBuildingById(unit.buildingId) : undefined;
                  const isBusy = busyInvoiceId === i.id;
                  return (
                    <tr key={i.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3 font-medium">{i.invoiceNumber}</td>
                      <td className="px-4 py-3">{tenant?.name}</td>
                      <td className="px-4 py-3">
                        <p>{unit?.unitNumber}</p>
                        <p className="text-xs text-muted-foreground">{building?.name}</p>
                      </td>
                      <td className="px-4 py-3">{format(new Date(i.dueDate), "dd/MM/yyyy")}</td>
                      <td className="px-4 py-3">{formatCurrency(i.amount)}</td>
                      <td className={`px-4 py-3 font-medium ${i.balance > 0 ? "text-red-600" : "text-emerald-600"}`}>
                        {formatCurrency(i.balance)}
                      </td>
                      <td className="px-4 py-3"><StatusBadge status={i.status} /></td>
                      <td className="px-4 py-3">
                        <EmailBadge status={i.emailStatus} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => navigate(`/invoices/${i.id}`)} title="View">
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleSend(i)} disabled={isBusy || i.status === "Paid" || i.status === "Cancelled"} title="Send/Resend Email">
                            {isBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDownload(i)} title="Download PDF">
                            <Download className="h-3.5 w-3.5" />
                          </Button>
                          {i.balance > 0 && i.status !== "Cancelled" && (
                            <Button variant="ghost" size="sm" onClick={() => handleMarkPaid(i)} title="Mark Paid" className="text-emerald-600">
                              <CheckCircle className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          <Button variant="ghost" size="sm" onClick={() => openEdit(i)} title="Edit">
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="sm" className="text-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => setDeletingInvoice(i)} title="Delete">
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
        open={Boolean(deletingInvoice)}
        onOpenChange={(o) => !o && setDeletingInvoice(undefined)}
        itemName={deletingInvoice?.invoiceNumber}
        onConfirm={() => deletingInvoice && deleteInvoice(deletingInvoice.id)}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingInvoice ? "Edit Invoice" : "New Invoice"}</DialogTitle>
            <DialogDescription>Fill in the invoice details below.</DialogDescription>
          </DialogHeader>
          <InvoiceForm initialData={editingInvoice} onClose={closeDialog} />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EmailBadge({ status }: { status?: string }) {
  if (!status || status === "Not Sent") {
    return <span className="text-xs text-muted-foreground">Not sent</span>;
  }
  if (status === "Sent") {
    return <span className="inline-flex items-center gap-1 text-xs text-emerald-600"><CheckCircle className="h-3 w-3" /> Sent</span>;
  }
  if (status === "Failed") {
    return <span className="text-xs text-red-600">Failed</span>;
  }
  if (status === "Queued") {
    return <span className="text-xs text-amber-600">Queued</span>;
  }
  return <span className="text-xs text-muted-foreground">{status}</span>;
}
