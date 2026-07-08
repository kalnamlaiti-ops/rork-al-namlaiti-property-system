// src/lib/invoiceGenerator.ts
// Invoice generation engine — pulls data from existing modules (leases, EWA bills,
// maintenance, expenses, previous invoices) and produces a complete invoice payload.

import type {
  EWABill,
  Expense,
  Invoice,
  InvoiceLineItem,
  Lease,
  MaintenanceRequest,
} from "@/types";

export interface InvoiceCalculationInput {
  lease: Lease;
  ewaBills: EWABill[];
  maintenanceRequests: MaintenanceRequest[];
  expenses: Expense[];
  previousInvoices: Invoice[];
  /** Year-month key the invoice is for, e.g. "2026-07". */
  periodKey: string;
  /** Building id for the lease's unit — used to match building-level expenses. */
  unitBuildingId?: string;
}

export interface InvoiceCalculationResult {
  rentAmount: number;
  ewaAmount: number;
  maintenanceAmount: number;
  otherExpensesAmount: number;
  previousBalance: number;
  subtotal: number;
  taxAmount: number;
  total: number;
  lineItems: InvoiceLineItem[];
  /** EWA bill IDs included in this invoice (for marking as Invoiced). */
  ewaBillIds: string[];
  /** Expense IDs included in this invoice. */
  expenseIds: string[];
  /** Maintenance IDs included in this invoice. */
  maintenanceIds: string[];
}

/** Format a Date to YYYY-MM-DD. */
export function toISODate(date: Date): string {
  return date.toISOString().split("T")[0];
}

/** Build a period key (YYYY-MM) from a date or string. */
export function toPeriodKey(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * Calculate the full invoice breakdown for a lease in a given billing period.
 * Pulls EWA bills, approved maintenance, approved expenses, and previous
 * outstanding balances automatically.
 */
export function calculateInvoice(input: InvoiceCalculationInput): InvoiceCalculationResult {
  const { lease, ewaBills, maintenanceRequests, expenses, previousInvoices, periodKey } = input;

  const unitBuildingId = (input as { unitBuildingId?: string }).unitBuildingId ?? "";

  const lineItems: InvoiceLineItem[] = [];
  const ewaBillIds: string[] = [];
  const expenseIds: string[] = [];
  const maintenanceIds: string[] = [];

  // 1. Monthly Rent
  const rentAmount = lease.monthlyRent || 0;
  if (rentAmount > 0) {
    lineItems.push({
      id: `li-rent-${periodKey}`,
      description: `Monthly Rent — ${formatPeriodLabel(periodKey)}`,
      amount: rentAmount,
      type: "Rent",
    });
  }

  // 2. EWA Bills for this lease in this period — only Pending (uninvoiced) ones
  const ewaForPeriod = ewaBills.filter(
    (b) => b.leaseId === lease.id && b.status === "Pending" && toPeriodKey(b.month) === periodKey,
  );
  ewaBillIds.push(...ewaForPeriod.map((b) => b.id));
  const ewaAmount = ewaForPeriod.reduce((sum, b) => sum + (b.billAmount || 0), 0);
  if (ewaAmount > 0) {
    lineItems.push({
      id: `li-ewa-${periodKey}`,
      description: `EWA Utility Charges — ${formatPeriodLabel(periodKey)}`,
      amount: ewaAmount,
      type: "EWA",
    });
  }

  // 3. Approved maintenance costs linked to this unit in this period.
  // Only Completed + tenantChargeable + not already invoiced.
  const maintForPeriod = maintenanceRequests.filter((m) => {
    if (m.unitId !== lease.unitId || m.status !== "Completed") return false;
    if (m.tenantChargeable === false) return false;
    if (m.invoiceId) return false; // already invoiced — prevent duplicates
    const ref = m.scheduledDate;
    if (!ref) return true;
    return toPeriodKey(ref) === periodKey;
  });
  maintenanceIds.push(...maintForPeriod.map((m) => m.id));
  const maintenanceAmount = maintForPeriod.reduce((sum, m) => sum + (m.cost || 0), 0);
  if (maintenanceAmount > 0) {
    lineItems.push({
      id: `li-maint-${periodKey}`,
      description: `Maintenance Charges — ${formatPeriodLabel(periodKey)}`,
      amount: maintenanceAmount,
      type: "Service Charge",
    });
  }

  // 4. Approved billable expenses assigned to this tenant/lease/unit/building in this period.
  // Only Approved + billable + not already invoiced.
  const expForPeriod = expenses.filter(
    (e) =>
      e.status === "Approved" &&
      e.billable !== false &&
      !e.invoiceId &&
      toPeriodKey(e.expenseDate) === periodKey &&
      (e.tenantId === lease.tenantId || e.leaseId === lease.id || e.unitId === lease.unitId || e.buildingId === unitBuildingId),
  );
  expenseIds.push(...expForPeriod.map((e) => e.id));
  const otherExpensesAmount = expForPeriod.reduce((sum, e) => sum + (e.amount || 0), 0);
  if (otherExpensesAmount > 0) {
    lineItems.push({
      id: `li-exp-${periodKey}`,
      description: `Additional Expenses — ${formatPeriodLabel(periodKey)}`,
      amount: otherExpensesAmount,
      type: "Other",
    });
  }

  // 5. Previous outstanding balance (unpaid invoices before this period)
  const previousBalance = previousInvoices
    .filter((inv) => inv.leaseId === lease.id && inv.balance > 0 && inv.status !== "Cancelled" && inv.status !== "Draft")
    .reduce((sum, inv) => sum + inv.balance, 0);
  if (previousBalance > 0) {
    lineItems.push({
      id: `li-prevbal-${periodKey}`,
      description: `Previous Outstanding Balance`,
      amount: previousBalance,
      type: "Other",
    });
  }

  const subtotal = lineItems.reduce((sum, li) => sum + li.amount, 0);
  const taxRate = 0; // Bahrain VAT on residential rent is 0%; adjustable per invoice
  const taxAmount = subtotal * (taxRate / 100);
  const total = subtotal + taxAmount;

  return {
    rentAmount,
    ewaAmount,
    maintenanceAmount,
    otherExpensesAmount,
    previousBalance,
    subtotal,
    taxAmount,
    total,
    lineItems,
    ewaBillIds,
    expenseIds,
    maintenanceIds,
  };
}

/** Human-readable period label, e.g. "July 2026". */
export function formatPeriodLabel(periodKey: string): string {
  const [year, month] = periodKey.split("-").map(Number);
  if (!year || !month) return periodKey;
  const date = new Date(year, month - 1, 1);
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

/**
 * Generate a unique invoice number in the format INV-YYYY-000001.
 * Uses the total invoice count to produce a sequential, zero-padded number.
 */
export function generateInvoiceNumber(existingCount: number): string {
  const year = new Date().getFullYear();
  const seq = String(existingCount + 1).padStart(6, "0");
  return `INV-${year}-${seq}`;
}

/**
 * Check whether an invoice already exists for a given lease + period.
 * Prevents duplicate invoice generation.
 */
export function invoiceExistsForPeriod(
  invoices: Invoice[],
  leaseId: string,
  periodKey: string,
): boolean {
  return invoices.some(
    (inv) =>
      inv.leaseId === leaseId &&
      inv.periodFrom &&
      toPeriodKey(inv.periodFrom) === periodKey &&
      inv.status !== "Cancelled",
  );
}

/** Compute the due date (e.g. 5 days after issue date). */
export function computeDueDate(issueDate: Date, daysFromIssue = 5): string {
  const due = new Date(issueDate);
  due.setDate(due.getDate() + daysFromIssue);
  return toISODate(due);
}
