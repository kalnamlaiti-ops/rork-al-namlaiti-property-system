export type OwnerStatus = "Active" | "Inactive";
export type BuildingStatus = "Active" | "Inactive";
export type UnitStatus = "Vacant" | "Occupied" | "Maintenance" | "Reserved";
export type UnitType = "Studio" | "1BR" | "2BR" | "3BR" | "4BR+" | "Commercial";
export type FurnishedType = "Furnished" | "Unfurnished" | "Semi-Furnished";
export type TenantType = "Individual" | "Company";
export type TenantStatus = "Active" | "Inactive";
export type LeaseStatus = "Active" | "Expired" | "Terminating" | "Draft";
export type InvoiceStatus = "Draft" | "Sent" | "Partial" | "Paid" | "Overdue" | "Cancelled";
export type EmailStatus = "Not Sent" | "Sent" | "Failed" | "Queued";

// ── WhatsApp delivery ──
export type WhatsAppStatus = "not_sent" | "queued" | "sent" | "delivered" | "read" | "failed";
export type WhatsAppChannel = "email" | "whatsapp" | "both";
export type PaymentMethod = "Bank Transfer" | "Cash" | "Cheque" | "Card" | "Online";
export type ExpenseStatus = "Pending" | "Approved" | "Paid" | "Rejected" | "Invoiced";
export type EWABillStatus = "Pending" | "Invoiced" | "Paid";

// ── EWA shared-meter distribution ──
export type EWAAccountStatus = "Active" | "Inactive";
export type AllocationMethod = "equal" | "percentage" | "fixed" | "meter";
export type VacantAction = "exclude" | "landlord";
export type EWADistributionStatus = "Draft" | "Distributed" | "Recalculated";

/** Per-unit allocation rule stored on an EWA account. */
export interface UnitAllocationRule {
  unitId: string;
  /** Percentage of the total bill (used when method = "percentage"). */
  percentage?: number;
  /** Fixed monthly amount (used when method = "fixed"). */
  fixedAmount?: number;
  /** Sub-meter readings (used when method = "meter"). */
  previousReading?: number;
  currentReading?: number;
}

/** A shared EWA (electricity/water) account that supplies multiple units. */
export interface EWAAccount {
  id: string;
  /** The main EWA account number, e.g. 1078980404. */
  accountNumber: string;
  nickname?: string;
  buildingId: string;
  status: EWAAccountStatus;
  allocationMethod: AllocationMethod;
  /** Unit IDs supplied by this account. */
  linkedUnitIds: string[];
  /** Per-unit allocation rules (percentages / fixed amounts / meter reads). */
  rules: UnitAllocationRule[];
  /** What to do with a vacant linked unit. */
  vacantAction: VacantAction;
  createdAt: string;
  notes?: string;
}

/** A single unit's computed share of an EWA bill. */
export interface EWABillAllocation {
  unitId: string;
  leaseId?: string;
  tenantId?: string;
  amount: number;
  vacant: boolean;
  /** True when this unit was skipped (vacant + exclude). */
  excluded: boolean;
  /** True when the landlord absorbs this unit's share (no tenant invoice). */
  chargeToLandlord: boolean;
  /** ID of the per-unit EWABill created when the distribution was processed. */
  ewaBillId?: string;
}

/** A monthly EWA bill entered for a shared account, split across units. */
export interface EWADistribution {
  id: string;
  accountId: string;
  billNumber: string;
  /** Billing month, e.g. "2026-07". */
  month: string;
  totalAmount: number;
  allocatedAmount: number;
  remainingBalance: number;
  dueDate: string;
  status: EWADistributionStatus;
  allocations: EWABillAllocation[];
  enteredAt: string;
  notes?: string;
}

export interface Owner {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: OwnerStatus;
  bankName: string;
  bankAccount: string;
  taxId?: string;
  buildingCount: number;
  notes?: string;
}

export interface Building {
  id: string;
  code: string;
  name: string;
  address: string;
  status: BuildingStatus;
  ownerId: string;
  floors: number;
  units: number;
  yearBuilt?: number;
  description?: string;
  purchaseDate?: string;
  purchasePrice?: number;
  currentValuation?: number;
  amenities?: string;
  insuranceProvider?: string;
  insurancePolicyNumber?: string;
  insuranceExpiryDate?: string;
}

export interface Unit {
  id: string;
  buildingId: string;
  unitNumber: string;
  floor: number;
  type: UnitType;
  size: number;
  bedrooms: number;
  bathrooms: number;
  furnished: FurnishedType;
  status: UnitStatus;
  baseRent: number;
  securityDeposit: number;
  serviceChargeType: "Flat Amount" | "Per sqft";
  serviceCharge: number;
  notes?: string;
}

export interface Tenant {
  id: string;
  name: string;
  email: string;
  phone: string;
  type: TenantType;
  status: TenantStatus;
  crNumber?: string;
  buildingId?: string;
  leaseCount: number;
  address?: string;
  notes?: string;
}

export interface Lease {
  id: string;
  contractNumber: string;
  tenantId: string;
  unitId: string;
  startDate: string;
  endDate: string;
  monthlyRent: number;
  securityDeposit: number;
  status: LeaseStatus;
  paymentFrequency: "Monthly" | "Quarterly" | "Yearly";
  contractDays: number;
  notes?: string;
  /** Building number for the lease agreement (Bldg No.). */
  buildingNumber?: string;
  /** Road/Street name for the lease agreement. */
  road?: string;
  /** Block number for the lease agreement. */
  block?: string;
  /** ID of the latest generated lease agreement for this lease. */
  agreementId?: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  tenantId: string;
  leaseId: string;
  unitId: string;
  /** Date the invoice was issued (YYYY-MM-DD). */
  issueDate?: string;
  dueDate: string;
  /** Billing period start (YYYY-MM-DD). */
  periodFrom?: string;
  /** Billing period end (YYYY-MM-DD). */
  periodTo?: string;
  /** Grand total (rent + EWA + maintenance + expenses + previous balance + tax). */
  amount: number;
  balance: number;
  status: InvoiceStatus;
  lineItems: InvoiceLineItem[];
  notes?: string;
  // ── Automated invoicing breakdown ──
  rentAmount?: number;
  ewaAmount?: number;
  maintenanceAmount?: number;
  otherExpensesAmount?: number;
  previousBalance?: number;
  taxRate?: number;
  taxAmount?: number;
  // ── Email delivery ──
  emailStatus?: EmailStatus;
  emailSentAt?: string;
  emailError?: string;
  // ── Accounting link ──
  journalEntryId?: string;
  // ── Metadata ──
  generatedAutomatically?: boolean;
  paymentInstructions?: string;
  // ── Linked charge IDs (for duplicate prevention & cascade) ──
  ewaBillIds?: string[];
  expenseIds?: string[];
  maintenanceIds?: string[];
}

export interface InvoiceLineItem {
  id: string;
  description: string;
  amount: number;
  type: "Rent" | "Service Charge" | "EWA" | "Other";
}

export interface Payment {
  id: string;
  receiptNumber: string;
  invoiceId: string;
  tenantId: string;
  amount: number;
  paymentDate: string;
  method: PaymentMethod;
  reference?: string;
  notes?: string;
  /** Whether a receipt email was sent to the tenant. */
  receiptEmailSent?: boolean;
  /** Auto-created journal entry id for this payment. */
  journalEntryId?: string;
}

export interface Expense {
  id: string;
  expenseNumber: string;
  category: string;
  vendor: string;
  buildingId?: string;
  unitId?: string;
  tenantId?: string;
  leaseId?: string;
  billable?: boolean;
  amount: number;
  expenseDate: string;
  status: ExpenseStatus;
  description?: string;
  /** ID of the invoice that billed this expense (set after invoicing). */
  invoiceId?: string;
}

export interface ChartOfAccount {
  id: string;
  code: string;
  name: string;
  type: "Asset" | "Liability" | "Equity" | "Income" | "Expense";
  balance: number;
  parentId?: string;
}

export interface JournalEntry {
  id: string;
  entryNumber: string;
  date: string;
  description: string;
  lines: JournalLine[];
  total: number;
}

export interface JournalLine {
  id: string;
  accountId: string;
  debit: number;
  credit: number;
  description?: string;
}

export interface Distribution {
  id: string;
  ownerId: string;
  buildingId?: string;
  period: string;
  amount: number;
  distributionDate?: string;
  status: "Pending" | "Processed" | "Paid";
  notes?: string;
}

export interface EWABill {
  id: string;
  billNumber: string;
  leaseId: string;
  unitId: string;
  buildingId: string;
  month: string;
  billAmount: number;
  limit: number;
  excess: number;
  dueDate: string;
  status: EWABillStatus;
  readings?: { previous: number; current: number };
  /** ID of the invoice that billed this EWA bill (set after invoicing). */
  invoiceId?: string;
}

export interface Complaint {
  id: string;
  ticketNumber: string;
  tenantId: string;
  unitId: string;
  title: string;
  description: string;
  status: "Open" | "In Progress" | "Resolved" | "Closed";
  priority: "Low" | "Medium" | "High" | "Urgent";
  createdAt: string;
}

export interface MaintenanceRequest {
  id: string;
  requestNumber: string;
  unitId: string;
  buildingId: string;
  title: string;
  description: string;
  status: "Pending" | "In Progress" | "Completed" | "Cancelled";
  cost?: number;
  vendor?: string;
  scheduledDate?: string;
  /** Whether the tenant is charged for this maintenance. */
  tenantChargeable?: boolean;
  /** ID of the invoice that billed this maintenance (set after invoicing). */
  invoiceId?: string;
}

export interface Vendor {
  id: string;
  name: string;
  category: string;
  contact: string;
  phone: string;
  email: string;
  status: "Active" | "Inactive";
}

export interface Asset {
  id: string;
  name: string;
  category: string;
  buildingId?: string;
  unitId?: string;
  purchaseDate: string;
  cost: number;
  status: "Active" | "Disposed" | "Under Maintenance";
}

export interface Document {
  id: string;
  name: string;
  type: string;
  entityType: "Owner" | "Building" | "Unit" | "Tenant" | "Lease" | "Invoice" | "General";
  entityId: string;
  uploadDate: string;
  fileUrl: string;
}

export type LeaseAgreementStatus = "Not Generated" | "Generating" | "Generated" | "Failed" | "Needs Regeneration";

/**
 * A generated lease agreement PDF. The actual PDF is generated on demand from
 * the master template + lease data, so we only store the metadata in the
 * shared workspace (not the full PDF bytes).
 */
export interface LeaseAgreement {
  id: string;
  leaseId: string;
  building: string;
  flat: string;
  tenant: string;
  rentAmount: number;
  startDate: string;
  endDate: string;
  templateVersion: string;
  generatedAt: string;
  generatedBy: string;
  status: LeaseAgreementStatus;
  documentId?: string;
  previousDocumentId?: string;
  lastError?: string;
}

export type HistoryAction = "Created" | "Edited" | "Deleted";

export interface HistoryEntry {
  id: string;
  action: HistoryAction;
  entityType: string;
  entityId: string;
  entityName: string;
  timestamp: string;
  summary: string;
  changes?: { field: string; from: string; to: string }[];
  /** Snapshot of the entity at deletion time, used by the Recover action. */
  snapshot?: unknown;
  /** Whether this deleted record has been recovered. */
  recovered?: boolean;
  /** Short label of the user who performed the action (e.g. "Guest-3f2a"). */
  actor?: string;
}

// ──────────────────────────── WhatsApp automation ────────────────────────────

/** Delivery status for a WhatsApp message log entry. */

/** A single WhatsApp message log entry — tracks every invoice sent via WhatsApp. */
export interface WhatsAppLog {
  id: string;
  /** Tenant the message was sent to. */
  tenantId: string;
  /** Invoice the message relates to. */
  invoiceId: string;
  /** Billing month key, e.g. "2026-07" — used for duplicate prevention. */
  billingMonth: string;
  /** Recipient phone number in international format (e.g. "9733xxxxxxx"). */
  phoneNumber: string;
  /** Message ID returned by the WhatsApp Cloud API. */
  whatsappMessageId?: string;
  /** When the send was attempted (ISO timestamp). */
  sentAt: string;
  /** Delivery status (updated via webhook or send response). */
  status: WhatsAppStatus;
  /** Read status — set true when WhatsApp reports the message was read. */
  readStatus?: boolean;
  /** Failure flag for dashboard filtering. */
  failed?: boolean;
  /** Error message if sending failed. */
  errorMessage?: string;
  /** Number of retry attempts (max 3). */
  retryCount: number;
  /** True when this log represents a resend (not the first attempt). */
  isResend?: boolean;
  /** Whether a PDF invoice was attached. */
  hasAttachment?: boolean;
}

/** WhatsApp integration settings (stored in the workspace, toggled by admin). */
export interface WhatsAppSettings {
  id: string;
  /** Whether automatic monthly sending is enabled. */
  autoSendEnabled: boolean;
  /** Day of month to run the automatic send (default 1). */
  sendDayOfMonth: number;
  /** Which delivery channel to use for invoices. */
  channel: WhatsAppChannel;
  /** Whether the WhatsApp API credentials are configured (read from server). */
  connected: boolean;
  /** Default country code prefix for phone normalization (e.g. "973"). */
  defaultCountryCode: string;
  /** ISO timestamp of the last successful automatic run. */
  lastAutoRunAt?: string;
  /** ISO timestamp of the last connection test. */
  lastTestedAt?: string;
  /** Whether the last connection test succeeded. */
  lastTestOk?: boolean;
  /** Error message from the last connection test. */
  lastTestError?: string;
}
