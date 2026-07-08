// src/lib/accountingHelper.ts
// Auto-posting accounting entries for invoices.
// Creates a balanced journal entry: Debit Accounts Receivable,
// Credit Rental Income + Maintenance Income + Utility Recovery (EWA).

import type { ChartOfAccount, Invoice, JournalEntry, JournalLine } from "@/types";
import { generateCode } from "@/context/DataContext";

export interface PostInvoiceJournalResult {
  entry: Omit<JournalEntry, "id" | "entryNumber">;
  lines: JournalLine[];
}

/** Standard account name constants used for auto-posting. */
export const ACCOUNT_NAMES = {
  ACCOUNTS_RECEIVABLE: "Accounts Receivable",
  RENTAL_INCOME: "Rental Income",
  MAINTENANCE_INCOME: "Maintenance Income",
  UTILITY_RECOVERY: "Utility Recovery (EWA)",
  OTHER_INCOME: "Other Income",
} as const;

/**
 * Find a chart-of-accounts entry by name (case-insensitive), or create
 * a payload for a missing one.
 */
export function findAccount(
  accounts: ChartOfAccount[],
  name: string,
): ChartOfAccount | undefined {
  return accounts.find((a) => a.name.toLowerCase() === name.toLowerCase());
}

/**
 * Build the journal entry for an invoice.
 * Debit: Accounts Receivable (total)
 * Credit: Rental Income (rent), Maintenance Income (maintenance),
 *         Utility Recovery (EWA), Other Income (expenses + prev balance)
 */
export function buildInvoiceJournalEntry(
  invoice: Invoice,
  accounts: ChartOfAccount[],
  existingJournalCount: number,
): PostInvoiceJournalResult {
  const arAccount = findAccount(accounts, ACCOUNT_NAMES.ACCOUNTS_RECEIVABLE);
  const rentalAccount = findAccount(accounts, ACCOUNT_NAMES.RENTAL_INCOME);
  const maintAccount = findAccount(accounts, ACCOUNT_NAMES.MAINTENANCE_INCOME);
  const utilityAccount = findAccount(accounts, ACCOUNT_NAMES.UTILITY_RECOVERY);
  const otherAccount = findAccount(accounts, ACCOUNT_NAMES.OTHER_INCOME);

  const lines: JournalLine[] = [];
  const total = invoice.amount;
  const rentAmount = invoice.rentAmount ?? 0;
  const ewaAmount = invoice.ewaAmount ?? 0;
  const maintAmount = invoice.maintenanceAmount ?? 0;
  const otherAmount = (invoice.otherExpensesAmount ?? 0) + (invoice.previousBalance ?? 0);

  // Debit Accounts Receivable
  if (arAccount && total > 0) {
    lines.push({
      id: `jl-debit-ar-${invoice.id}`,
      accountId: arAccount.id,
      debit: total,
      credit: 0,
      description: `AR for invoice ${invoice.invoiceNumber}`,
    });
  }

  // Credit Rental Income
  if (rentalAccount && rentAmount > 0) {
    lines.push({
      id: `jl-credit-rent-${invoice.id}`,
      accountId: rentalAccount.id,
      debit: 0,
      credit: rentAmount,
      description: `Rental income for ${invoice.invoiceNumber}`,
    });
  }

  // Credit Utility Recovery (EWA)
  if (utilityAccount && ewaAmount > 0) {
    lines.push({
      id: `jl-credit-ewa-${invoice.id}`,
      accountId: utilityAccount.id,
      debit: 0,
      credit: ewaAmount,
      description: `EWA recovery for ${invoice.invoiceNumber}`,
    });
  }

  // Credit Maintenance Income
  if (maintAccount && maintAmount > 0) {
    lines.push({
      id: `jl-credit-maint-${invoice.id}`,
      accountId: maintAccount.id,
      debit: 0,
      credit: maintAmount,
      description: `Maintenance income for ${invoice.invoiceNumber}`,
    });
  }

  // Credit Other Income
  if (otherAccount && otherAmount > 0) {
    lines.push({
      id: `jl-credit-other-${invoice.id}`,
      accountId: otherAccount.id,
      debit: 0,
      credit: otherAmount,
      description: `Other income for ${invoice.invoiceNumber}`,
    });
  }

  const entry: Omit<JournalEntry, "id" | "entryNumber"> = {
    date: invoice.issueDate ?? invoice.dueDate,
    description: `Auto-posted invoice ${invoice.invoiceNumber}`,
    lines,
    total,
  };

  return { entry, lines };
}

/** Generate the entry number for a new journal entry. */
export function nextJournalEntryNumber(count: number): string {
  return generateCode("JE", count);
}
