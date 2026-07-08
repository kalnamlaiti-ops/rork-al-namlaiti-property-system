// src/lib/automation.ts
// Event-driven automation engine — computes the side effects that should
// cascade across modules when a lease, invoice, or payment event occurs.
//
// This module is pure: it takes the current data store + the triggering
// event and returns a list of mutations (updates/adds) that the caller
// applies via the sync layer. Keeping it pure makes the cascade testable
// and prevents race conditions inside React state updaters.

import type {
  ChartOfAccount,
  Expense,
  EWABill,
  Invoice,
  JournalEntry,
  JournalLine,
  Lease,
  MaintenanceRequest,
  Payment,
  Tenant,
  Unit,
} from "@/types";

export interface CascadeUpdate {
  collection: "units" | "tenants" | "invoices" | "ewaBills" | "expenses" | "maintenanceRequests" | "journalEntries" | "chartOfAccounts";
  kind: "update" | "add";
  id?: string;
  patch?: Record<string, unknown>;
  entity?: Record<string, unknown>;
}

// ──────────────────────────── Lease cascade ────────────────────────────

/**
 * When a lease is created or updated, automatically:
 *  - Mark the linked unit as "Occupied" (if lease is Active)
 *  - Update the tenant's buildingId to match the unit's building
 *  - Increment tenant leaseCount if this is a new active lease
 */
export function leaseCascade(
  lease: Lease,
  units: Unit[],
  tenants: Tenant[],
  buildings: { id: string; ownerId: string }[],
): CascadeUpdate[] {
  const updates: CascadeUpdate[] = [];

  const unit = units.find((u) => u.id === lease.unitId);
  if (unit) {
    // Update unit status based on lease status
    const newUnitStatus = lease.status === "Active" ? "Occupied" : unit.status;
    if (unit.status !== newUnitStatus) {
      updates.push({
        collection: "units",
        kind: "update",
        id: unit.id,
        patch: { status: newUnitStatus },
      });
    }

    // Link tenant to the building
    const building = buildings.find((b) => b.id === unit.buildingId);
    const tenant = tenants.find((t) => t.id === lease.tenantId);
    if (tenant && building && tenant.buildingId !== building.id) {
      updates.push({
        collection: "tenants",
        kind: "update",
        id: tenant.id,
        patch: { buildingId: building.id },
      });
    }
  }

  return updates;
}

// ──────────────────────────── Invoice cascade ────────────────────────────

/**
 * After an invoice is generated, mark all linked charges as "Invoiced"
 * so they can never be billed twice. Returns the cascade updates.
 */
export function invoiceCascade(
  invoice: Invoice,
): CascadeUpdate[] {
  const updates: CascadeUpdate[] = [];

  // Mark EWA bills as Invoiced
  for (const ewaId of invoice.ewaBillIds ?? []) {
    updates.push({
      collection: "ewaBills",
      kind: "update",
      id: ewaId,
      patch: { status: "Invoiced", invoiceId: invoice.id },
    });
  }

  // Mark expenses as Invoiced
  for (const expId of invoice.expenseIds ?? []) {
    updates.push({
      collection: "expenses",
      kind: "update",
      id: expId,
      patch: { status: "Invoiced", invoiceId: invoice.id },
    });
  }

  // Mark maintenance as Invoiced
  for (const mntId of invoice.maintenanceIds ?? []) {
    updates.push({
      collection: "maintenanceRequests",
      kind: "update",
      id: mntId,
      patch: { invoiceId: invoice.id },
    });
  }

  return updates;
}

// ──────────────────────────── Payment cascade ────────────────────────────

/**
 * When a payment is recorded, compute all cascading effects:
 *  - Update invoice balance & status (Paid / Partial)
 *  - Mark linked EWA/Expense/Maintenance as Paid if invoice is fully paid
 *  - Build the accounting journal entry (Debit Cash/Bank, Credit AR)
 *
 * Returns cascade updates + the journal entry payload.
 */
export function paymentCascade(
  payment: Payment,
  invoice: Invoice,
  accounts: ChartOfAccount[],
  existingJournalCount: number,
): {
  updates: CascadeUpdate[];
  journalEntry?: Omit<JournalEntry, "id" | "entryNumber">;
} {
  const updates: CascadeUpdate[] = [];

  // Calculate new balance
  const totalPaid = payment.amount;
  const newBalance = Math.max(0, invoice.balance - totalPaid);
  const newStatus = newBalance === 0 ? "Paid" : "Partial";

  updates.push({
    collection: "invoices",
    kind: "update",
    id: invoice.id,
    patch: { balance: newBalance, status: newStatus },
  });

  // If fully paid, mark linked charges as Paid
  if (newStatus === "Paid") {
    for (const ewaId of invoice.ewaBillIds ?? []) {
      updates.push({
        collection: "ewaBills",
        kind: "update",
        id: ewaId,
        patch: { status: "Paid" },
      });
    }
    for (const expId of invoice.expenseIds ?? []) {
      updates.push({
        collection: "expenses",
        kind: "update",
        id: expId,
        patch: { status: "Paid" },
      });
    }
  }

  // Build accounting journal entry: Debit Cash/Bank, Credit Accounts Receivable
  const cashAccount = accounts.find(
    (a) => a.name.toLowerCase().includes("cash") || a.name.toLowerCase().includes("bank"),
  );
  const arAccount = accounts.find(
    (a) => a.name.toLowerCase() === "accounts receivable",
  );

  const lines: JournalLine[] = [];

  if (cashAccount && totalPaid > 0) {
    lines.push({
      id: `jl-debit-cash-${payment.id}`,
      accountId: cashAccount.id,
      debit: totalPaid,
      credit: 0,
      description: `Cash received for payment ${payment.receiptNumber}`,
    });
  }

  if (arAccount && totalPaid > 0) {
    lines.push({
      id: `jl-credit-ar-${payment.id}`,
      accountId: arAccount.id,
      debit: 0,
      credit: totalPaid,
      description: `AR cleared for invoice ${invoice.invoiceNumber}`,
    });
  }

  let journalEntry: Omit<JournalEntry, "id" | "entryNumber"> | undefined;
  if (lines.length > 0) {
    journalEntry = {
      date: payment.paymentDate,
      description: `Auto-posted payment receipt ${payment.receiptNumber} for ${invoice.invoiceNumber}`,
      lines,
      total: totalPaid,
    };
  }

  return { updates, journalEntry };
}

// ──────────────────────────── Duplicate prevention ────────────────────────────

/**
 * Check whether an EWA bill has already been invoiced.
 */
export function isEwaInvoiced(bill: EWABill): boolean {
  return bill.status === "Invoiced" || bill.status === "Paid" || !!bill.invoiceId;
}

/**
 * Check whether an expense has already been invoiced.
 */
export function isExpenseInvoiced(expense: Expense): boolean {
  return expense.status === "Invoiced" || expense.status === "Paid" || !!expense.invoiceId;
}

/**
 * Check whether a maintenance request has already been invoiced.
 */
export function isMaintenanceInvoiced(req: MaintenanceRequest): boolean {
  return !!req.invoiceId;
}
