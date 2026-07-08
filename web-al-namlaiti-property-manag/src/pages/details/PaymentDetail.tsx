import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useData } from "@/context/DataContext";
import PaymentForm from "@/components/forms/PaymentForm";
import { ArrowLeft, Pencil, CheckCircle2, Receipt, Calendar, User, CreditCard } from "lucide-react";
import { format } from "date-fns";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-BH", { style: "currency", currency: "BHD", maximumFractionDigits: 2 }).format(amount);
}

export default function PaymentDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { payments, invoices } = useData();
  const [dialogOpen, setDialogOpen] = useState(false);

  const payment = id ? payments.find((p) => p.id === id) : undefined;
  const invoice = payment ? invoices.find((i) => i.id === payment.invoiceId) : undefined;

  if (!payment) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate("/payments")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <p className="text-muted-foreground">Payment not found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => navigate("/payments")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <Button variant="outline" onClick={() => setDialogOpen(true)}>
          <Pencil className="mr-2 h-4 w-4" /> Edit
        </Button>
      </div>

      <Card className="mx-auto max-w-2xl">
        <CardContent className="p-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <p className="text-3xl font-bold text-foreground">{formatCurrency(payment.amount)}</p>
          <p className="text-sm text-muted-foreground">Payment Received</p>
        </CardContent>
      </Card>

      <Card className="mx-auto max-w-2xl">
        <CardContent className="p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-sm text-muted-foreground">Payment #</p>
              <p className="font-medium flex items-center gap-2"><Receipt className="h-4 w-4" /> {payment.receiptNumber}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Date</p>
              <p className="font-medium flex items-center gap-2"><Calendar className="h-4 w-4" /> {format(new Date(payment.paymentDate), "dd MMM yyyy")}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Tenant</p>
              <p className="font-medium flex items-center gap-2"><User className="h-4 w-4" /> {payment.tenantId}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Invoice</p>
              <p className="font-medium flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                <Link to={`/invoices/${invoice?.id}`} className="text-primary hover:underline">{invoice?.invoiceNumber}</Link>
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Method</p>
              <p className="font-medium">{payment.method}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Reference</p>
              <p className="font-medium">{payment.reference || "—"}</p>
            </div>
            {payment.notes && (
              <div className="sm:col-span-2">
                <p className="text-sm text-muted-foreground">Notes</p>
                <p className="whitespace-pre-line font-medium">{payment.notes}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Payment</DialogTitle>
            <DialogDescription>Update the payment details below.</DialogDescription>
          </DialogHeader>
          <PaymentForm initialData={payment} onClose={() => setDialogOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
