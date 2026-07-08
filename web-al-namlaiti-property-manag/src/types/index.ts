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
export type PaymentMethod = "Bank Transfer" | "Cash" | "Cheque" | "Card" | "Online";
export type ExpenseStatus = "Pending" | "Approved" | "Paid" | "Rejected" | "Invoiced";
export type EWABillStatus = "Pending" | "Invoiced" | "Paid";

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
