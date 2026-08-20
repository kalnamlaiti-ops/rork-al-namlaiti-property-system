import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useData } from "@/context/DataContext";
import LeaseForm from "@/components/forms/LeaseForm";
import { ArrowLeft, Pencil, FileText, Home, Calendar, User, Eye, Download, RefreshCw, AlertCircle } from "lucide-react";
import { format } from "date-fns";

export default function LeaseDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { leases, tenants, units, buildings, invoices, payments, documents, getLeaseById, getTenantById, getUnitById, getBuildingById, getLeaseAgreementByLeaseId, getDocumentById, regenerateLeaseAgreement } = useData();
  const [dialogOpen, setDialogOpen] = useState(false);

  const lease = id ? getLeaseById(id) : undefined;
  const tenant = lease ? getTenantById(lease.tenantId) : undefined;
  const unit = lease ? getUnitById(lease.unitId) : undefined;
  const building = unit ? getBuildingById(unit.buildingId) : undefined;
  const leaseInvoices = lease ? invoices.filter((i) => i.leaseId === lease.id) : [];
  const leasePayments = lease ? payments.filter((p) => p.invoiceId && leaseInvoices.some((i) => i.id === p.invoiceId)) : [];
  const agreement = lease ? getLeaseAgreementByLeaseId(lease.id) : undefined;
  const agreementDoc = agreement?.documentId ? getDocumentById(agreement.documentId) : undefined;

  if (!lease) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate("/leases")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <p className="text-muted-foreground">Lease not found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => navigate("/leases")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <Button variant="outline" onClick={() => setDialogOpen(true)}>
          <Pencil className="mr-2 h-4 w-4" /> Edit
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold text-foreground">{lease.contractNumber}</h1>
        <StatusBadge status={lease.status} />
      </div>
      <p className="text-sm text-muted-foreground">
        <Link to={`/tenants/${tenant?.id}`} className="text-primary hover:underline">{tenant?.name}</Link>
        {" · "}
        <Link to={`/units/${unit?.id}`} className="text-primary hover:underline">{unit?.unitNumber}</Link>
        {" · "}
        <Link to={`/buildings/${building?.id}`} className="text-primary hover:underline">{building?.name}</Link>
      </p>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card><CardContent className="p-5"><p className="text-2xl font-bold text-foreground">BHD {lease.monthlyRent}</p><p className="text-xs text-muted-foreground">Monthly Rent</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-2xl font-bold text-foreground">BHD {lease.securityDeposit}</p><p className="text-xs text-muted-foreground">Security Deposit</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-2xl font-bold text-foreground">{leaseInvoices.length}</p><p className="text-xs text-muted-foreground">Invoices</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-2xl font-bold text-foreground">{leasePayments.length}</p><p className="text-xs text-muted-foreground">Payments</p></CardContent></Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardContent className="p-6">
            <h3 className="mb-4 text-base font-semibold">Lease Details</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div><p className="text-sm text-muted-foreground">Start Date</p><p className="font-medium">{format(new Date(lease.startDate), "dd MMM yyyy")}</p></div>
              <div><p className="text-sm text-muted-foreground">End Date</p><p className="font-medium">{format(new Date(lease.endDate), "dd MMM yyyy")}</p></div>
              <div><p className="text-sm text-muted-foreground">Building Number</p><p className="font-medium">{lease.buildingNumber || "—"}</p></div>
              <div><p className="text-sm text-muted-foreground">Road</p><p className="font-medium">{lease.road || "—"}</p></div>
              <div><p className="text-sm text-muted-foreground">Block</p><p className="font-medium">{lease.block || "—"}</p></div>
              <div><p className="text-sm text-muted-foreground">Payment Frequency</p><p className="font-medium">{lease.paymentFrequency}</p></div>
              <div><p className="text-sm text-muted-foreground">Contract Days</p><p className="font-medium">{lease.contractDays}</p></div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h3 className="mb-4 text-base font-semibold">Unit & Tenant</h3>
            <div className="space-y-3">
              <Link to={`/tenants/${tenant?.id}`} className="flex items-center gap-3 rounded-lg bg-muted/50 p-3 hover:bg-muted/80">
                <User className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">{tenant?.name}</p>
                  <p className="text-xs text-muted-foreground">{tenant?.email}</p>
                </div>
              </Link>
              <Link to={`/units/${unit?.id}`} className="flex items-center gap-3 rounded-lg bg-muted/50 p-3 hover:bg-muted/80">
                <Home className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Unit {unit?.unitNumber}</p>
                  <p className="text-xs text-muted-foreground">{building?.name}</p>
                </div>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-base font-semibold">Lease Agreement</h3>
            <StatusBadge status={agreement?.status ?? "Not Generated"} />
          </div>
          {agreement ? (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div><p className="text-sm text-muted-foreground">Generated</p><p className="font-medium">{format(new Date(agreement.generatedAt), "dd MMM yyyy HH:mm")}</p></div>
                <div><p className="text-sm text-muted-foreground">Template Version</p><p className="font-medium">{agreement.templateVersion}</p></div>
                {agreement.lastError && (
                  <div className="sm:col-span-2 flex items-start gap-2 rounded-md bg-red-50 p-3 text-sm text-red-700">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{agreement.lastError}</span>
                  </div>
                )}
              </div>
              <div className="flex flex-wrap gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={agreement.status !== "Generated" || !agreementDoc?.fileUrl}
                  onClick={() => agreementDoc?.fileUrl && window.open(agreementDoc.fileUrl, "_blank")}
                >
                  <Eye className="mr-2 h-4 w-4" /> View
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={agreement.status !== "Generated" || !agreementDoc?.fileUrl}
                  onClick={() => {
                    if (agreementDoc?.fileUrl) {
                      const link = document.createElement("a");
                      link.href = agreementDoc.fileUrl;
                      link.download = `${lease.contractNumber}-Lease-Agreement.pdf`;
                      link.click();
                    }
                  }}
                >
                  <Download className="mr-2 h-4 w-4" /> Download PDF
                </Button>
                <Button variant="outline" size="sm" onClick={() => lease && regenerateLeaseAgreement(lease)}>
                  <RefreshCw className="mr-2 h-4 w-4" /> Regenerate
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No agreement has been generated yet.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <h3 className="mb-4 text-base font-semibold">Invoices</h3>
          {leaseInvoices.length === 0 ? (
            <p className="text-sm text-muted-foreground">No invoices.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Invoice #</th>
                    <th className="px-4 py-3 text-left font-medium">Due Date</th>
                    <th className="px-4 py-3 text-left font-medium">Amount</th>
                    <th className="px-4 py-3 text-left font-medium">Balance</th>
                    <th className="px-4 py-3 text-left font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {leaseInvoices.map((i) => (
                    <tr key={i.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3"><Link to={`/invoices/${i.id}`} className="font-medium text-primary hover:underline">{i.invoiceNumber}</Link></td>
                      <td className="px-4 py-3">{format(new Date(i.dueDate), "dd MMM yyyy")}</td>
                      <td className="px-4 py-3">BHD {i.amount}</td>
                      <td className="px-4 py-3">BHD {i.balance}</td>
                      <td className="px-4 py-3"><StatusBadge status={i.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Lease</DialogTitle>
            <DialogDescription>Update the lease contract details below.</DialogDescription>
          </DialogHeader>
          <LeaseForm initialData={lease} onClose={() => setDialogOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
