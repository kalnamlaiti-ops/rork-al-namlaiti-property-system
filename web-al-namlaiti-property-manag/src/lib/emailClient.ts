// src/lib/emailClient.ts
// Client-side wrapper that calls the Cloudflare Worker email endpoint
// to send invoice emails via the Gmail API (OAuth2) from namlity@gmail.com.

import { getInvoicePdfBase64, type PdfContext } from "./pdfGenerator";
import { formatPeriodLabel } from "./invoiceGenerator";
import type { Invoice, Payment, Tenant } from "@/types";

export interface SendInvoiceEmailResult {
  success: boolean;
  message: string;
}

const FUNCTIONS_URL =
  (import.meta.env.VITE_RORK_FUNCTIONS_URL as string | undefined) ??
  (import.meta.env.EXPO_PUBLIC_RORK_FUNCTIONS_URL as string | undefined) ??
  "";

/**
 * Send an invoice email to the tenant with a PDF attachment.
 * Calls the Worker /api/send-invoice endpoint which uses the Gmail API.
 */
export async function sendInvoiceEmail(ctx: PdfContext): Promise<SendInvoiceEmailResult> {
  const { invoice, tenant, building } = ctx;

  if (!tenant?.email) {
    return { success: false, message: "Tenant has no email address" };
  }

  const periodKey = invoice.periodFrom
    ? `${invoice.periodFrom.slice(0, 4)}-${invoice.periodFrom.slice(5, 7)}`
    : "";
  const periodLabel = periodKey ? formatPeriodLabel(periodKey) : "Current Month";
  const buildingName = building?.name ?? "Property";
  const monthYear = new Date(invoice.issueDate ?? invoice.dueDate).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const subject = `Monthly Rental Invoice – ${buildingName} – ${monthYear}`;

  const breakdown: string[] = [];
  if (invoice.rentAmount && invoice.rentAmount > 0) {
    breakdown.push(`  • Monthly Rent: ${invoice.rentAmount.toFixed(2)} BHD`);
  }
  if (invoice.ewaAmount && invoice.ewaAmount > 0) {
    breakdown.push(`  • EWA Utility Charges: ${invoice.ewaAmount.toFixed(2)} BHD`);
  }
  if (invoice.maintenanceAmount && invoice.maintenanceAmount > 0) {
    breakdown.push(`  • Maintenance Charges: ${invoice.maintenanceAmount.toFixed(2)} BHD`);
  }
  if (invoice.otherExpensesAmount && invoice.otherExpensesAmount > 0) {
    breakdown.push(`  • Additional Expenses: ${invoice.otherExpensesAmount.toFixed(2)} BHD`);
  }
  if (invoice.previousBalance && invoice.previousBalance > 0) {
    breakdown.push(`  • Previous Outstanding Balance: ${invoice.previousBalance.toFixed(2)} BHD`);
  }
  const breakdownText = breakdown.length > 0
    ? breakdown.join("\n") + "\n"
    : "";

  const body = `Dear ${tenant.name},

We hope you are doing well. Please find attached your monthly rental invoice for the period of ${periodLabel}.

Invoice Details:
• Invoice Number: ${invoice.invoiceNumber}
• Building: ${buildingName}
• Unit: ${ctx.unit?.unitNumber ?? "—"}
• Period: ${periodLabel}
• Due Date: ${formatDate(invoice.dueDate)}

Amount Breakdown:
${breakdownText}
• Total Amount Due: ${invoice.amount.toFixed(2)} BHD

Please ensure payment is made on or before the due date to avoid any late charges.

If you have any questions regarding this invoice, please do not hesitate to contact us.

Thank you for your tenancy.

Best regards,
${ctx.companyName}
${ctx.companyEmail}
${ctx.companyPhone}`;

  // Generate PDF as base64
  let pdfBase64 = "";
  try {
    pdfBase64 = getInvoicePdfBase64(ctx);
  } catch (err) {
    console.error("[email] PDF generation failed", err);
    return { success: false, message: "Failed to generate PDF attachment" };
  }

  if (!FUNCTIONS_URL) {
    console.warn("[email] No backend URL configured — email will be queued but not sent");
    return { success: false, message: "Email backend not configured" };
  }

  try {
    const res = await fetch(`${FUNCTIONS_URL}/api/send-invoice`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: tenant.email,
        subject,
        body,
        attachmentName: `${invoice.invoiceNumber}.pdf`,
        attachmentBase64: pdfBase64,
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "Unknown error");
      return { success: false, message: `Email send failed: ${text}` };
    }

    return { success: true, message: "Invoice email sent successfully" };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Network error";
    return { success: false, message: `Email send failed: ${msg}` };
  }
}

function formatDate(iso: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/**
 * Send a payment receipt email to the tenant (no PDF attachment — plain text confirmation).
 * Calls the Worker /api/send-invoice endpoint which uses the Gmail API.
 */
export async function sendPaymentReceiptEmail(
  payment: Payment,
  invoice: Invoice,
  tenant: Tenant,
): Promise<SendInvoiceEmailResult> {
  if (!tenant.email) {
    return { success: false, message: "Tenant has no email address" };
  }

  const newBalance = Math.max(0, invoice.balance - payment.amount);
  const statusLabel = newBalance === 0 ? "Fully Paid" : "Partially Paid";

  const subject = `Payment Receipt – ${payment.receiptNumber} – ${invoice.invoiceNumber}`;

  const body = `Dear ${tenant.name},

We have received your payment. Thank you for your prompt payment.

Payment Details:
• Receipt Number: ${payment.receiptNumber}
• Invoice Number: ${invoice.invoiceNumber}
• Payment Date: ${formatDate(payment.paymentDate)}
• Amount Received: ${payment.amount.toFixed(2)} BHD
• Payment Method: ${payment.method}
• Invoice Status: ${statusLabel}
• Remaining Balance: ${newBalance.toFixed(2)} BHD

If you have any questions regarding this payment, please do not hesitate to contact us.

Best regards,
Al Namlaiti Property Management
namlity@gmail.com
+973 3380 4311`;

  if (!FUNCTIONS_URL) {
    console.warn("[email] No backend URL configured — receipt email queued but not sent");
    return { success: false, message: "Email backend not configured" };
  }

  try {
    const res = await fetch(`${FUNCTIONS_URL}/api/send-invoice`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: tenant.email,
        subject,
        body,
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "Unknown error");
      return { success: false, message: `Receipt email failed: ${text}` };
    }

    return { success: true, message: "Payment receipt sent successfully" };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Network error";
    return { success: false, message: `Receipt email failed: ${msg}` };
  }
}
