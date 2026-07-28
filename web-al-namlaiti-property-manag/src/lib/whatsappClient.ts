// src/lib/whatsappClient.ts
// Client-side wrapper that calls the Cloudflare Worker WhatsApp endpoints
// to send invoice messages via the Meta WhatsApp Cloud API.
//
// Features:
// - Builds the professional invoice message body.
// - Generates a PDF attachment (base64) and attaches it.
// - Retry logic (up to 3 attempts with backoff).
// - Duplicate prevention (checks existing logs before sending).
// - Connection test endpoint.

import { getInvoicePdfBase64, type PdfContext } from "./pdfGenerator";
import { formatPeriodLabel } from "./invoiceGenerator";
import type { Invoice, Tenant, WhatsAppLog } from "@/types";

export interface SendWhatsAppResult {
  success: boolean;
  message: string;
  messageId?: string;
}

const FUNCTIONS_URL =
  (import.meta.env.VITE_RORK_FUNCTIONS_URL as string | undefined) ??
  (import.meta.env.EXPO_PUBLIC_RORK_FUNCTIONS_URL as string | undefined) ??
  "";

/**
 * Normalize a phone number to international format without + or spaces.
 * If the number starts with 0, replace it with the default country code.
 */
export function normalizePhoneNumber(
  phone: string,
  defaultCountryCode = "973",
): string {
  let cleaned = phone.replace(/[\s\-()+]/g, "");
  if (cleaned.startsWith("00")) {
    cleaned = cleaned.slice(2);
  } else if (cleaned.startsWith("0")) {
    cleaned = defaultCountryCode + cleaned.slice(1);
  } else if (!/^\d{6,}/.test(cleaned)) {
    // Too short — likely invalid
    cleaned = defaultCountryCode + cleaned;
  }
  return cleaned;
}

/**
 * Build the WhatsApp message body for an invoice, matching the required template.
 */
export function buildWhatsAppMessage(ctx: PdfContext): string {
  const { invoice, tenant, unit, building } = ctx;

  const periodKey = invoice.periodFrom
    ? `${invoice.periodFrom.slice(0, 4)}-${invoice.periodFrom.slice(5, 7)}`
    : "";
  const monthLabel = periodKey ? formatPeriodLabel(periodKey) : "Current Month";
  const buildingName = building?.name ?? "—";
  const unitNumber = unit?.unitNumber ?? "—";

  const rent = invoice.rentAmount ?? 0;
  const ewa = invoice.ewaAmount ?? 0;
  const expenses = (invoice.maintenanceAmount ?? 0) + (invoice.otherExpensesAmount ?? 0);
  const previousBalance = invoice.previousBalance ?? 0;
  const total = invoice.amount;
  const dueDate = formatDate(invoice.dueDate);

  return `Hello ${tenant?.name ?? "Tenant"},

Your monthly invoice for ${monthLabel} is ready.

Building: ${buildingName}
Unit: ${unitNumber}
Rent: ${rent.toFixed(2)} BHD
EWA: ${ewa.toFixed(2)} BHD
Expenses: ${expenses.toFixed(2)} BHD
Previous Balance: ${previousBalance.toFixed(2)} BHD
Total Amount Due: ${total.toFixed(2)} BHD
Due Date: ${dueDate}

Please find your invoice attached.

Thank you,
Al Namlaiti Property`;
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
 * Test the WhatsApp API connection by calling the Worker test endpoint.
 */
export async function testWhatsAppConnection(): Promise<SendWhatsAppResult> {
  if (!FUNCTIONS_URL) {
    return { success: false, message: "Backend URL not configured" };
  }

  try {
    const res = await fetch(`${FUNCTIONS_URL}/api/whatsapp/test`, {
      method: "POST",
    });
    const data = (await res.json()) as {
      ok: boolean;
      connected?: boolean;
      phoneNumber?: string;
      businessName?: string;
      error?: string;
    };

    if (data.ok && data.connected) {
      return {
        success: true,
        message: `Connected — ${data.phoneNumber ?? "phone configured"} (${data.businessName ?? "business"})`,
      };
    }
    return { success: false, message: data.error ?? "Connection failed" };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Network error";
    return { success: false, message: `Connection test failed: ${msg}` };
  }
}

/**
 * Send a WhatsApp invoice message to a tenant with PDF attachment.
 * Handles retry logic (up to 3 attempts with backoff).
 */
export async function sendInvoiceWhatsApp(
  ctx: PdfContext,
  options?: { isResend?: boolean },
): Promise<SendWhatsAppResult> {
  const { invoice, tenant } = ctx;
  const isResend = options?.isResend ?? false;

  if (!tenant?.phone) {
    return { success: false, message: "Tenant has no phone number" };
  }

  const phoneNumber = normalizePhoneNumber(tenant.phone);
  if (phoneNumber.length < 8) {
    return { success: false, message: `Invalid phone number: ${tenant.phone}` };
  }

  const body = buildWhatsAppMessage(ctx);

  // Generate PDF attachment
  let pdfBase64 = "";
  try {
    pdfBase64 = getInvoicePdfBase64(ctx);
  } catch (err) {
    console.error("[whatsapp] PDF generation failed", err);
    return { success: false, message: "Failed to generate PDF attachment" };
  }

  if (!FUNCTIONS_URL) {
    console.warn("[whatsapp] No backend URL configured — message queued but not sent");
    return { success: false, message: "WhatsApp backend not configured" };
  }

  // Retry logic — up to 3 attempts
  const maxRetries = 3;
  let lastError = "";

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(`${FUNCTIONS_URL}/api/whatsapp/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: phoneNumber,
          body,
          attachmentName: `${invoice.invoiceNumber}.pdf`,
          attachmentBase64: pdfBase64,
        }),
      });

      const data = (await res.json()) as {
        ok: boolean;
        messageId?: string;
        error?: string;
        sentTo?: string;
      };

      if (data.ok) {
        return {
          success: true,
          message: isResend
            ? "WhatsApp invoice resent successfully"
            : "WhatsApp invoice sent successfully",
          messageId: data.messageId,
        };
      }

      lastError = data.error ?? "Unknown error";
      console.warn(`[whatsapp] attempt ${attempt} failed: ${lastError}`);

      // If this isn't the last attempt, wait before retrying
      if (attempt < maxRetries) {
        await sleep(Math.pow(2, attempt) * 1000); // 2s, 4s backoff
      }
    } catch (err) {
      lastError = err instanceof Error ? err.message : "Network error";
      console.warn(`[whatsapp] attempt ${attempt} network error: ${lastError}`);
      if (attempt < maxRetries) {
        await sleep(Math.pow(2, attempt) * 1000);
      }
    }
  }

  return {
    success: false,
    message: `WhatsApp send failed after ${maxRetries} attempts: ${lastError}`,
  };
}

/**
 * Check whether a WhatsApp message has already been sent for a given
 * tenant + billing month. Used for duplicate prevention.
 */
export function whatsappAlreadySent(
  logs: WhatsAppLog[],
  tenantId: string,
  billingMonth: string,
): boolean {
  return logs.some(
    (log) =>
      log.tenantId === tenantId &&
      log.billingMonth === billingMonth &&
      (log.status === "sent" || log.status === "delivered" || log.status === "read") &&
      !log.failed,
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
