import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useData } from "@/context/DataContext";
import InvoiceForm from "@/components/forms/InvoiceForm";
import PaymentForm from "@/components/forms/PaymentForm";
import {
  ArrowLeft,
  Pencil,
  CreditCard,
  Send,
  Download,
  CheckCircle,
  XCircle,
  Loader2,
  Mail,
  MessageCircle,
  Printer,
} from "lucide-react";
import { format } from "date-fns";
import { generateInvoicePdf, downloadInvoicePdf } from "@/lib/pdfGenerator";
import type { Invoice } from "@/types";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-BH", { style: "currency", currency: "BHD", maximumFractionDigits: 2 }).format(amount);
}

export default function InvoiceDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    invoices,
    payments,
    getInvoiceById,
    getTenantById,
    getUnitById,
    getBuildingById,
    sendInvoice,
    sendInvoiceWhatsAppMessage,
    markInvoicePaid,
    voidInvoice,
    buildPdfContext,
  } = useData();

  const [editDialog, setEditDialog] = useState(false);
  const [paymentDialog, setPaymentDialog] = useState(false);
  const [previewDialog, setPreviewDialog] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendingWa, setSendingWa] = useState(false);
  const [markingPaid, setMarkingPaid] = useState(false);
  const [voiding, setVoiding] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string>("");

  const invoice = id ? getInvoiceById(id) : undefined;
  const tenant = invoice ? getTenantById(invoice.tenantId) : undefined;
  const unit = invoice ? getUnitById(invoice.unitId) : undefined;
  const building = unit ? getBuildingById(unit.buildingId) : undefined;
  const invoicePayments = invoice ? payments.filter((p) => p.invoiceId === invoice.id) : [];
  const totalPaid = invoicePayments.reduce((sum, p) => sum + p.amount, 0);

  if (!invoice) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate("/invoices")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <p className="text-muted-foreground">Invoice not found.</p>
      </div>
    );
  }

  const handleSend = async () => {
    setSending(true);
    try {
      await sendInvoice(invoice.id);
    } finally {
      setSending(false);
    }
  };

  const handleSendWhatsApp = async () => {
    setSendingWa(true);
    try {
      await sendInvoiceWhatsAppMessage(invoice.id);
    } finally {
      setSendingWa(false);
    }
  };

  const handlePreview = () => {
    const ctx = buildPdfContext(invoice);
    const doc = generateInvoicePdf(ctx);
    const url = doc.output("bloburl");
    setPreviewUrl(typeof url === "string" ? url : URL.createObjectURL(doc.output("blob")));
    setPreviewDialog(true);
  };

  const handleDownload = () => {
    const ctx = buildPdfContext(invoice);
    downloadInvoicePdf(ctx);
  };

  const handlePrint = () => {
    const ctx = buildPdfContext(invoice);
    const doc = generateInvoicePdf(ctx);
    doc.autoPrint();
    window.open(doc.output("bloburl"), "_blank");
  };

  const handleMarkPaid = async () => {
    setMarkingPaid(true);
    try {
      markInvoicePaid(invoice.id);
    } finally {
      setMarkingPaid(false);
    }
  };

  const handleVoid = async () => {
    setVoiding(true);
    try {
      voidInvoice(invoice.id);
    } finally {
      setVoiding(false);
    }
  };

  const canEdit = invoice.status === "Draft" || invoice.status === "Sent";
  const isCancelled = invoice.status === "Cancelled";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => navigate("/invoices")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={handlePreview}>
            <Printer className="mr-2 h-4 w-4" /> Preview
          </Button>
          <Button variant="outline" onClick={handleDownload}>
            <Download className="mr-2 h-4 w-4" /> Download PDF
          </Button>
          <Button variant="outline" onClick={handleSend} disabled={sending || isCancelled}>
            {sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
            {invoice.emailStatus === "Sent" ? "Resend" : "Send"}
          </Button>
          <Button variant="outline" onClick={handleSendWhatsApp} disabled={sendingWa || isCancelled || !tenant?.phone} title={!tenant?.phone ? "Tenant has no phone number" : "Send via WhatsApp"}>
            {sendingWa ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MessageCircle className="mr-2 h-4 w-4" />}
            WhatsApp
          </Button>
          {canEdit && (
            <Button variant="outline" onClick={() => setEditDialog(true)}>
              <Pencil className="mr-2 h-4 w-4" /> Edit
            </Button>
          )}
          <Button variant="outline" onClick={() => setPaymentDialog(true)} disabled={isCancelled}>
            <CreditCard className="mr-2 h-4 w-4" /> Record Payment
          </Button>
          {invoice.balance > 0 && !isCancelled && (
            <Button variant="outline" onClick={handleMarkPaid} disabled={markingPaid} className="text-emerald-600">
              {markingPaid ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />} Mark Paid
            </Button>
          )}
          {!isCancelled && (
            <Button variant="outline" onClick={handleVoid} disabled={voiding} className="text-red-600">
              {voiding ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <XCircle className="mr-2 h-4 w-4" />} Void
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold text-foreground">{invoice.invoiceNumber}</h1>
        <StatusBadge status={invoice.status} />
        {invoice.generatedAutomatically && (
          <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-600">Auto-generated</span>
        )}
      </div>

      {/* Email status banner */}
      {invoice.emailStatus && invoice.emailStatus !== "Not Sent" && (
        <div className={`flex items-center gap-2 rounded-lg p-3 text-sm ${
          invoice.emailStatus === "Sent" ? "bg-emerald-50 text-emerald-700" :
          invoice.emailStatus === "Failed" ? "bg-red-50 text-red-700" :
          "bg-amber-50 text-amber-700"
        }`}>
          <Mail className="h-4 w-4" />
          <span>
            Email: {invoice.emailStatus}
            {invoice.emailSentAt && ` · ${format(new Date(invoice.emailSentAt), "dd MMM yyyy HH:mm")}`}
            {invoice.emailError && ` · ${invoice.emailError}`}
          </span>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardContent className="p-6">
            <div className="mb-6 flex items-start justify-between">
              <div>
                <p className="text-sm font-semibold text-primary">INVOICE</p>
                <p className="text-2xl font-bold text-foreground">{invoice.invoiceNumber}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Issue Date</p>
                <p className="font-medium">{invoice.issueDate ? format(new Date(invoice.issueDate), "dd MMM yyyy") : "—"}</p>
                <p className="text-sm text-muted-foreground">Due Date</p>
                <p className="font-medium">{format(new Date(invoice.dueDate), "dd MMM yyyy")}</p>
              </div>
            </div>

            <div className="mb-6 grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-sm font-semibold text-muted-foreground">Bill To</p>
                <p className="font-medium">{tenant?.name}</p>
                <p className="text-sm text-muted-foreground">{tenant?.email}</p>
                <p className="text-sm text-muted-foreground">{tenant?.phone}</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-muted-foreground">Unit</p>
                <p className="font-medium">{unit?.unitNumber}</p>
                <p className="text-sm text-muted-foreground">{building?.name}</p>
                {invoice.periodFrom && (
                  <>
                    <p className="mt-2 text-sm font-semibold text-muted-foreground">Period</p>
                    <p className="text-sm">{format(new Date(invoice.periodFrom), "dd MMM yyyy")} → {invoice.periodTo ? format(new Date(invoice.periodTo), "dd MMM yyyy") : ""}</p>
                  </>
                )}
              </div>
            </div>

            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium">Description</th>
                    <th className="px-4 py-2 text-left font-medium">Type</th>
                    <th className="px-4 py-2 text-right font-medium">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {invoice.lineItems.map((li) => (
                    <tr key={li.id}>
                      <td className="px-4 py-2">{li.description}</td>
                      <td className="px-4 py-2 text-muted-foreground">{li.type}</td>
                      <td className="px-4 py-2 text-right font-medium">{formatCurrency(li.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 space-y-1 text-right text-sm">
              {(invoice.rentAmount ?? 0) > 0 && <p>Rent: {formatCurrency(invoice.rentAmount ?? 0)}</p>}
              {(invoice.ewaAmount ?? 0) > 0 && <p>EWA Charges: {formatCurrency(invoice.ewaAmount ?? 0)}</p>}
              {(invoice.maintenanceAmount ?? 0) > 0 && <p>Maintenance: {formatCurrency(invoice.maintenanceAmount ?? 0)}</p>}
              {(invoice.otherExpensesAmount ?? 0) > 0 && <p>Other Expenses: {formatCurrency(invoice.otherExpensesAmount ?? 0)}</p>}
              {(invoice.previousBalance ?? 0) > 0 && <p>Previous Balance: {formatCurrency(invoice.previousBalance ?? 0)}</p>}
              <p className="font-semibold text-lg">Total: {formatCurrency(invoice.amount)}</p>
              <p className="text-emerald-600">Amount Paid: {formatCurrency(totalPaid)}</p>
              <p className="text-red-600 font-semibold">Balance Due: {formatCurrency(invoice.balance)}</p>
            </div>

            {invoice.paymentInstructions && (
              <div className="mt-6 rounded-lg bg-muted/50 p-4">
                <p className="text-sm font-semibold">Payment Instructions</p>
                <p className="mt-1 text-sm text-muted-foreground">{invoice.paymentInstructions}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardContent className="p-5">
              <h3 className="mb-3 text-base font-semibold">Payments</h3>
              {invoicePayments.length === 0 ? (
                <p className="text-sm text-muted-foreground">No payments recorded.</p>
              ) : (
                <div className="space-y-3">
                  {invoicePayments.map((p) => (
                    <Link key={p.id} to={`/payments/${p.id}`} className="flex items-center justify-between rounded-lg bg-muted/50 p-3 hover:bg-muted/80">
                      <div>
                        <p className="font-medium">{p.receiptNumber}</p>
                        <p className="text-xs text-muted-foreground">{format(new Date(p.paymentDate), "dd MMM yyyy")}</p>
                      </div>
                      <p className="font-semibold text-emerald-600">{formatCurrency(p.amount)}</p>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {invoice.journalEntryId && (
            <Card>
              <CardContent className="p-5">
                <h3 className="mb-2 text-base font-semibold">Accounting</h3>
                <p className="text-sm text-muted-foreground">Journal entry posted automatically.</p>
                <p className="mt-1 text-sm font-medium">Entry ID: {invoice.journalEntryId}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editDialog} onOpenChange={setEditDialog}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Invoice</DialogTitle>
            <DialogDescription>Update the invoice details below.</DialogDescription>
          </DialogHeader>
          <InvoiceForm initialData={invoice} onClose={() => setEditDialog(false)} />
        </DialogContent>
      </Dialog>

      {/* Payment Dialog */}
      <Dialog open={paymentDialog} onOpenChange={setPaymentDialog}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
            <DialogDescription>Record a payment against this invoice.</DialogDescription>
          </DialogHeader>
          <PaymentForm preselectedInvoiceId={invoice.id} onClose={() => setPaymentDialog(false)} />
        </DialogContent>
      </Dialog>

      {/* PDF Preview Dialog */}
      <Dialog open={previewDialog} onOpenChange={setPreviewDialog}>
        <DialogContent className="max-h-[95vh] max-w-4xl overflow-hidden">
          <DialogHeader>
            <DialogTitle>Invoice Preview — {invoice.invoiceNumber}</DialogTitle>
            <DialogDescription>Preview of the generated PDF invoice.</DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pb-2">
            <Button size="sm" variant="outline" onClick={handleDownload}>
              <Download className="mr-1 h-3.5 w-3.5" /> Download
            </Button>
            <Button size="sm" variant="outline" onClick={handleSend} disabled={sending || isCancelled}>
              {sending ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Send className="mr-1 h-3.5 w-3.5" />} Send
            </Button>
          </div>
          {previewUrl && (
            <iframe src={previewUrl} className="h-[70vh] w-full rounded-lg border" title="Invoice PDF" />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
