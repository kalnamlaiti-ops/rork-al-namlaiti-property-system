import { useCallback, useEffect, useRef, useState } from "react";
import createContextHook from "@nkzw/create-context-hook";
import { toast } from "sonner";

import type {
  Asset,
  Building,
  ChartOfAccount,
  Complaint,
  Distribution,
  Document,
  EWABill,
  Expense,
  HistoryAction,
  HistoryEntry,
  Invoice,
  JournalEntry,
  Lease,
  MaintenanceRequest,
  Owner,
  Payment,
  Tenant,
  Unit,
  Vendor,
} from "@/types";
import {
  syncClient,
  getActorLabel,
  type ConnectionStatus,
  type MutateOp,
  type ServerMessage,
} from "@/lib/syncClient";
import {
  calculateInvoice,
  computeDueDate,
  generateInvoiceNumber,
  invoiceExistsForPeriod,
  toISODate,
  toPeriodKey,
} from "@/lib/invoiceGenerator";
import { buildInvoiceJournalEntry } from "@/lib/accountingHelper";
import { sendInvoiceEmail, sendPaymentReceiptEmail } from "@/lib/emailClient";
import type { PdfContext } from "@/lib/pdfGenerator";
import { leaseCascade, invoiceCascade, paymentCascade } from "@/lib/automation";

export interface DataStore {
  owners: Owner[];
  buildings: Building[];
  units: Unit[];
  tenants: Tenant[];
  leases: Lease[];
  invoices: Invoice[];
  payments: Payment[];
  expenses: Expense[];
  chartOfAccounts: ChartOfAccount[];
  journalEntries: JournalEntry[];
  distributions: Distribution[];
  ewaBills: EWABill[];
  complaints: Complaint[];
  maintenanceRequests: MaintenanceRequest[];
  vendors: Vendor[];
  assets: Asset[];
  documents: Document[];
  history: HistoryEntry[];
}

const EMPTY_STORE: DataStore = {
  owners: [],
  buildings: [],
  units: [],
  tenants: [],
  leases: [],
  invoices: [],
  payments: [],
  expenses: [],
  chartOfAccounts: [],
  journalEntries: [],
  distributions: [],
  ewaBills: [],
  complaints: [],
  maintenanceRequests: [],
  vendors: [],
  assets: [],
  documents: [],
  history: [],
};

function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function nowISO(): string {
  return new Date().toISOString();
}

function describeValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "string") return value || "—";
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return `[${value.length} items]`;
  if (typeof value === "object") return JSON.stringify(value).slice(0, 120);
  return String(value);
}

function diffChanges<T extends Record<string, unknown>>(
  before: T,
  after: Partial<T>,
): { field: string; from: string; to: string }[] {
  const changes: { field: string; from: string; to: string }[] = [];
  for (const key of Object.keys(after) as (keyof T)[]) {
    const a = before[key];
    const b = after[key];
    if (JSON.stringify(a) !== JSON.stringify(b)) {
      changes.push({ field: String(key), from: describeValue(a), to: describeValue(b) });
    }
  }
  return changes;
}

export function generateCode(prefix: string, count: number): string {
  return `${prefix}-${new Date().getFullYear()}-${String(count + 1).padStart(3, "0")}`;
}

// Entity type → collection key mapping (used for recover).
const ENTITY_TYPE_TO_COLLECTION: Record<string, keyof DataStore> = {
  Owner: "owners",
  Building: "buildings",
  Unit: "units",
  Tenant: "tenants",
  Lease: "leases",
  Invoice: "invoices",
  Payment: "payments",
  Expense: "expenses",
  "EWA Bill": "ewaBills",
  "Chart of Account": "chartOfAccounts",
  "Journal Entry": "journalEntries",
  Distribution: "distributions",
  Vendor: "vendors",
  Asset: "assets",
  Complaint: "complaints",
  "Maintenance Request": "maintenanceRequests",
  Document: "documents",
};

export const [DataProvider, useData] = createContextHook(() => {
  const [data, setData] = useState<DataStore>(EMPTY_STORE);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("connecting");
  const actorRef = useRef<string>(typeof window === "undefined" ? "Guest-local" : getActorLabel());
  // Track the most recent history entry id we sent locally, so we don't
  // double-apply history entries echoed back from the server.
  const localHistoryEchoGuard = useRef<Set<string>>(new Set());

  // ─────────────────────────── Sync wiring ───────────────────────────

  // Apply a server "patch" mutation to local state.
  const applyPatch = useCallback((op: MutateOp, actor?: string) => {
    setData((prev) => {
      const arr = prev[op.collection] as unknown[];
      if (!Array.isArray(arr)) return prev;

      if (op.kind === "add") {
        const entity = op.entity as { id?: string };
        const idx = arr.findIndex((r) => (r as { id?: string }).id === entity.id);
        let nextArr: unknown[];
        if (idx >= 0) {
          nextArr = arr.slice();
          nextArr[idx] = entity;
        } else {
          nextArr = [...arr, entity];
        }
        // If this is a local echo of a history entry we just pushed, skip
        // adding a duplicate history row (the server already has it).
        if (op.collection === "history" && entity.id && localHistoryEchoGuard.current.has(entity.id)) {
          localHistoryEchoGuard.current.delete(entity.id);
          return prev; // history already contains it from optimistic update
        }
        return { ...prev, [op.collection]: nextArr };
      }

      if (op.kind === "update") {
        const nextArr = arr.map((r) => {
          const row = r as { id: string };
          if (row.id === op.id) return { ...row, ...op.patch, id: op.id };
          return r;
        });
        return { ...prev, [op.collection]: nextArr };
      }

      if (op.kind === "delete") {
        const nextArr = arr.filter((r) => (r as { id: string }).id !== op.id);
        return { ...prev, [op.collection]: nextArr };
      }

      return prev;
    });
    void actor; // actor is informational; attribution is in the history entry
  }, []);

  const handleServerMessage = useCallback((msg: ServerMessage) => {
    switch (msg.type) {
      case "snapshot":
        setData({ ...EMPTY_STORE, ...msg.store });
        break;
      case "patch":
        applyPatch(msg.op, msg.actor);
        break;
      case "recover":
        setData((prev) => {
          const collection = msg.restored.collection;
          const arr = prev[collection] as { id: string }[];
          if (arr.some((r) => r.id === (msg.restored.entity.id as string))) return prev;
          return {
            ...prev,
            [collection]: [...arr, msg.restored.entity as { id: string }],
            history: prev.history.map((h) => (h.id === msg.historyId ? { ...h, recovered: true } : h)),
          };
        });
        break;
      case "clearHistory":
        setData((prev) => ({ ...prev, history: [] }));
        break;
      case "error":
        console.warn("[sync] server error:", msg.message);
        break;
    }
  }, [applyPatch]);

  useEffect(() => {
    syncClient.setMessageHandler(handleServerMessage);
    syncClient.setStatusHandler(setConnectionStatus);
    syncClient.connect();
    return () => {
      syncClient.dispose();
    };
  }, [handleServerMessage]);

  // ─────────────────────────── Helpers ───────────────────────────

  const updateArray = useCallback(
    <K extends keyof DataStore>(key: K, updater: (current: DataStore[K]) => DataStore[K]) => {
      setData((prev) => ({ ...prev, [key]: updater(prev[key]) }));
    },
    [],
  );

  const pushHistory = useCallback(
    (entry: Omit<HistoryEntry, "id" | "timestamp">) => {
      const full: HistoryEntry = {
        ...entry,
        id: generateId("hist"),
        timestamp: nowISO(),
        actor: actorRef.current,
      };
      // Optimistic local update.
      localHistoryEchoGuard.current.add(full.id);
      updateArray("history", (arr) => [full, ...arr].slice(0, 500));
      // Push to shared workspace.
      syncClient.sendMutate(
        { kind: "add", collection: "history", entity: full as unknown as Record<string, unknown> },
        actorRef.current,
      );
    },
    [updateArray],
  );

  // Send an add mutation for an entity (optimistic update + server push).
  const sendAdd = useCallback(
    <K extends keyof DataStore>(collection: K, entity: DataStore[K][number]) => {
      updateArray(collection, (arr) => [...arr, entity] as unknown as DataStore[K]);
      syncClient.sendMutate(
        { kind: "add", collection, entity: entity as unknown as Record<string, unknown> },
        actorRef.current,
      );
    },
    [updateArray],
  );

  // Send an update mutation.
  const sendUpdate = useCallback(
    <K extends keyof DataStore>(collection: K, id: string, patch: Record<string, unknown>) => {
      updateArray(collection, (arr) =>
        (arr as { id: string }[]).map((r) => (r.id === id ? { ...r, ...patch, id } : r)) as unknown as DataStore[K],
      );
      syncClient.sendMutate({ kind: "update", collection, id, patch }, actorRef.current);
    },
    [updateArray],
  );

  // Send a delete mutation (with snapshot for recover support).
  const sendDelete = useCallback(
    <K extends keyof DataStore>(collection: K, id: string, snapshot?: Record<string, unknown>) => {
      updateArray(collection, (arr) => (arr as { id: string }[]).filter((r) => r.id !== id) as unknown as DataStore[K]);
      syncClient.sendMutate({ kind: "delete", collection, id, snapshot }, actorRef.current);
    },
    [updateArray],
  );

  // ────────────────────────────── Owners ──────────────────────────────
  const addOwner = useCallback(
    (owner: Omit<Owner, "id">) => {
      const newOwner: Owner = { ...owner, id: generateId("own") };
      sendAdd("owners", newOwner);
      pushHistory({
        action: "Created" as HistoryAction,
        entityType: "Owner",
        entityId: newOwner.id,
        entityName: newOwner.name,
        summary: `Owner "${newOwner.name}" created`,
      });
      toast.success(`Owner "${newOwner.name}" created`);
      return newOwner;
    },
    [sendAdd, pushHistory],
  );

  const updateOwner = useCallback(
    (id: string, updates: Partial<Owner>) => {
      let changes: { field: string; from: string; to: string }[] = [];
      let name = "Owner";
      setData((prev) => {
        const existing = prev.owners.find((o) => o.id === id);
        if (!existing) return prev;
        name = existing.name;
        changes = diffChanges(existing as unknown as Record<string, unknown>, updates as Record<string, unknown>);
        return prev;
      });
      sendUpdate("owners", id, updates as unknown as Record<string, unknown>);
      pushHistory({
        action: "Edited" as HistoryAction,
        entityType: "Owner",
        entityId: id,
        entityName: name,
        summary: `Owner "${name}" edited (${changes.length} field${changes.length === 1 ? "" : "s"} changed)`,
        changes,
      });
      toast.success("Owner updated");
    },
    [sendUpdate, pushHistory],
  );

  const deleteOwner = useCallback(
    (id: string) => {
      let name = "Owner";
      let snapshot: Owner | undefined;
      setData((prev) => {
        const existing = prev.owners.find((o) => o.id === id);
        if (existing) { name = existing.name; snapshot = existing; }
        return prev;
      });
      sendDelete("owners", id, snapshot as unknown as Record<string, unknown>);
      pushHistory({
        action: "Deleted" as HistoryAction,
        entityType: "Owner",
        entityId: id,
        entityName: name,
        summary: `Owner "${name}" deleted`,
        snapshot,
      });
      toast.success("Owner deleted");
    },
    [sendDelete, pushHistory],
  );

  // ────────────────────────────── Buildings ──────────────────────────────
  const addBuilding = useCallback(
    (building: Omit<Building, "id">) => {
      const newBuilding: Building = { ...building, id: generateId("bld") };
      sendAdd("buildings", newBuilding);
      pushHistory({
        action: "Created",
        entityType: "Building",
        entityId: newBuilding.id,
        entityName: newBuilding.name,
        summary: `Building "${newBuilding.name}" created`,
      });
      toast.success(`Building "${newBuilding.name}" created`);
      return newBuilding;
    },
    [sendAdd, pushHistory],
  );

  const updateBuilding = useCallback(
    (id: string, updates: Partial<Building>) => {
      let changes: { field: string; from: string; to: string }[] = [];
      let name = "Building";
      setData((prev) => {
        const existing = prev.buildings.find((b) => b.id === id);
        if (!existing) return prev;
        name = existing.name;
        changes = diffChanges(existing as unknown as Record<string, unknown>, updates as Record<string, unknown>);
        return prev;
      });
      sendUpdate("buildings", id, updates as unknown as Record<string, unknown>);
      pushHistory({
        action: "Edited",
        entityType: "Building",
        entityId: id,
        entityName: name,
        summary: `Building "${name}" edited (${changes.length} field${changes.length === 1 ? "" : "s"} changed)`,
        changes,
      });
      toast.success("Building updated");
    },
    [sendUpdate, pushHistory],
  );

  const deleteBuilding = useCallback(
    (id: string) => {
      let name = "Building";
      let snapshot: Building | undefined;
      setData((prev) => {
        const existing = prev.buildings.find((b) => b.id === id);
        if (existing) { name = existing.name; snapshot = existing; }
        return prev;
      });
      sendDelete("buildings", id, snapshot as unknown as Record<string, unknown>);
      pushHistory({
        action: "Deleted",
        entityType: "Building",
        entityId: id,
        entityName: name,
        summary: `Building "${name}" deleted`,
        snapshot,
      });
      toast.success("Building deleted");
    },
    [sendDelete, pushHistory],
  );

  // ────────────────────────────── Units ──────────────────────────────
  const addUnit = useCallback(
    (unit: Omit<Unit, "id">) => {
      const newUnit: Unit = { ...unit, id: generateId("u") };
      sendAdd("units", newUnit);
      pushHistory({
        action: "Created",
        entityType: "Unit",
        entityId: newUnit.id,
        entityName: newUnit.unitNumber,
        summary: `Unit "${newUnit.unitNumber}" created`,
      });
      toast.success(`Unit "${newUnit.unitNumber}" created`);
      return newUnit;
    },
    [sendAdd, pushHistory],
  );

  const updateUnit = useCallback(
    (id: string, updates: Partial<Unit>) => {
      let changes: { field: string; from: string; to: string }[] = [];
      let name = "Unit";
      setData((prev) => {
        const existing = prev.units.find((u) => u.id === id);
        if (!existing) return prev;
        name = existing.unitNumber;
        changes = diffChanges(existing as unknown as Record<string, unknown>, updates as Record<string, unknown>);
        return prev;
      });
      sendUpdate("units", id, updates as unknown as Record<string, unknown>);
      pushHistory({
        action: "Edited",
        entityType: "Unit",
        entityId: id,
        entityName: name,
        summary: `Unit "${name}" edited (${changes.length} field${changes.length === 1 ? "" : "s"} changed)`,
        changes,
      });
      toast.success("Unit updated");
    },
    [sendUpdate, pushHistory],
  );

  const deleteUnit = useCallback(
    (id: string) => {
      let name = "Unit";
      let snapshot: Unit | undefined;
      setData((prev) => {
        const existing = prev.units.find((u) => u.id === id);
        if (existing) { name = existing.unitNumber; snapshot = existing; }
        return prev;
      });
      sendDelete("units", id, snapshot as unknown as Record<string, unknown>);
      pushHistory({
        action: "Deleted",
        entityType: "Unit",
        entityId: id,
        entityName: name,
        summary: `Unit "${name}" deleted`,
        snapshot,
      });
      toast.success("Unit deleted");
    },
    [sendDelete, pushHistory],
  );

  // ────────────────────────────── Tenants ──────────────────────────────
  const addTenant = useCallback(
    (tenant: Omit<Tenant, "id">) => {
      const newTenant: Tenant = { ...tenant, id: generateId("t") };
      sendAdd("tenants", newTenant);
      pushHistory({
        action: "Created",
        entityType: "Tenant",
        entityId: newTenant.id,
        entityName: newTenant.name,
        summary: `Tenant "${newTenant.name}" created`,
      });
      toast.success(`Tenant "${newTenant.name}" created`);
      return newTenant;
    },
    [sendAdd, pushHistory],
  );

  const updateTenant = useCallback(
    (id: string, updates: Partial<Tenant>) => {
      let changes: { field: string; from: string; to: string }[] = [];
      let name = "Tenant";
      setData((prev) => {
        const existing = prev.tenants.find((t) => t.id === id);
        if (!existing) return prev;
        name = existing.name;
        changes = diffChanges(existing as unknown as Record<string, unknown>, updates as Record<string, unknown>);
        return prev;
      });
      sendUpdate("tenants", id, updates as unknown as Record<string, unknown>);
      pushHistory({
        action: "Edited",
        entityType: "Tenant",
        entityId: id,
        entityName: name,
        summary: `Tenant "${name}" edited (${changes.length} field${changes.length === 1 ? "" : "s"} changed)`,
        changes,
      });
      toast.success("Tenant updated");
    },
    [sendUpdate, pushHistory],
  );

  const deleteTenant = useCallback(
    (id: string) => {
      let name = "Tenant";
      let snapshot: Tenant | undefined;
      setData((prev) => {
        const existing = prev.tenants.find((t) => t.id === id);
        if (existing) { name = existing.name; snapshot = existing; }
        return prev;
      });
      sendDelete("tenants", id, snapshot as unknown as Record<string, unknown>);
      pushHistory({
        action: "Deleted",
        entityType: "Tenant",
        entityId: id,
        entityName: name,
        summary: `Tenant "${name}" deleted`,
        snapshot,
      });
      toast.success("Tenant deleted");
    },
    [sendDelete, pushHistory],
  );

  // ────────────────────────────── Leases ──────────────────────────────
  const addLease = useCallback(
    (lease: Omit<Lease, "id">) => {
      const newLease: Lease = { ...lease, id: generateId("l") };
      sendAdd("leases", newLease);
      // ── Cascade: auto-link unit status, tenant building ──
      const cascade = leaseCascade(newLease, data.units, data.tenants, data.buildings);
      for (const upd of cascade) {
        if (upd.kind === "update" && upd.id && upd.patch) {
          sendUpdate(upd.collection as keyof DataStore, upd.id, upd.patch);
        }
      }
      pushHistory({
        action: "Created",
        entityType: "Lease",
        entityId: newLease.id,
        entityName: newLease.contractNumber,
        summary: `Lease "${newLease.contractNumber}" created — unit & tenant auto-linked`,
      });
      toast.success(`Lease "${newLease.contractNumber}" created — unit & tenant auto-linked`);
      return newLease;
    },
    [sendAdd, pushHistory, sendUpdate, data.units, data.tenants, data.buildings],
  );

  const updateLease = useCallback(
    (id: string, updates: Partial<Lease>) => {
      let changes: { field: string; from: string; to: string }[] = [];
      let name = "Lease";
      let updatedLease: Lease | undefined;
      setData((prev) => {
        const existing = prev.leases.find((l) => l.id === id);
        if (!existing) return prev;
        name = existing.contractNumber;
        changes = diffChanges(existing as unknown as Record<string, unknown>, updates as Record<string, unknown>);
        updatedLease = { ...existing, ...updates };
        return prev;
      });
      sendUpdate("leases", id, updates as unknown as Record<string, unknown>);
      // ── Cascade: re-link unit status & tenant if lease changed ──
      if (updatedLease) {
        const cascade = leaseCascade(updatedLease, data.units, data.tenants, data.buildings);
        for (const upd of cascade) {
          if (upd.kind === "update" && upd.id && upd.patch) {
            sendUpdate(upd.collection as keyof DataStore, upd.id, upd.patch);
          }
        }
      }
      pushHistory({
        action: "Edited",
        entityType: "Lease",
        entityId: id,
        entityName: name,
        summary: `Lease "${name}" edited (${changes.length} field${changes.length === 1 ? "" : "s"} changed)`,
        changes,
      });
      toast.success("Lease updated");
    },
    [sendUpdate, pushHistory, sendUpdate, data.units, data.tenants, data.buildings],
  );

  const deleteLease = useCallback(
    (id: string) => {
      let name = "Lease";
      let snapshot: Lease | undefined;
      setData((prev) => {
        const existing = prev.leases.find((l) => l.id === id);
        if (existing) { name = existing.contractNumber; snapshot = existing; }
        return prev;
      });
      sendDelete("leases", id, snapshot as unknown as Record<string, unknown>);
      pushHistory({
        action: "Deleted",
        entityType: "Lease",
        entityId: id,
        entityName: name,
        summary: `Lease "${name}" deleted`,
        snapshot,
      });
      toast.success("Lease deleted");
    },
    [sendDelete, pushHistory],
  );

  // ────────────────────────────── Invoices ──────────────────────────────
  const addInvoice = useCallback(
    (invoice: Omit<Invoice, "id">) => {
      const newInvoice: Invoice = { ...invoice, id: generateId("inv") };
      sendAdd("invoices", newInvoice);
      pushHistory({
        action: "Created",
        entityType: "Invoice",
        entityId: newInvoice.id,
        entityName: newInvoice.invoiceNumber,
        summary: `Invoice "${newInvoice.invoiceNumber}" created`,
      });
      toast.success(`Invoice "${newInvoice.invoiceNumber}" created`);
      return newInvoice;
    },
    [sendAdd, pushHistory],
  );

  const updateInvoice = useCallback(
    (id: string, updates: Partial<Invoice>) => {
      let changes: { field: string; from: string; to: string }[] = [];
      let name = "Invoice";
      setData((prev) => {
        const existing = prev.invoices.find((i) => i.id === id);
        if (!existing) return prev;
        name = existing.invoiceNumber;
        changes = diffChanges(existing as unknown as Record<string, unknown>, updates as Record<string, unknown>);
        return prev;
      });
      sendUpdate("invoices", id, updates as unknown as Record<string, unknown>);
      pushHistory({
        action: "Edited",
        entityType: "Invoice",
        entityId: id,
        entityName: name,
        summary: `Invoice "${name}" edited (${changes.length} field${changes.length === 1 ? "" : "s"} changed)`,
        changes,
      });
      toast.success("Invoice updated");
    },
    [sendUpdate, pushHistory],
  );

  const deleteInvoice = useCallback(
    (id: string) => {
      let name = "Invoice";
      let snapshot: Invoice | undefined;
      setData((prev) => {
        const existing = prev.invoices.find((i) => i.id === id);
        if (existing) { name = existing.invoiceNumber; snapshot = existing; }
        return prev;
      });
      sendDelete("invoices", id, snapshot as unknown as Record<string, unknown>);
      pushHistory({
        action: "Deleted",
        entityType: "Invoice",
        entityId: id,
        entityName: name,
        summary: `Invoice "${name}" deleted`,
        snapshot,
      });
      toast.success("Invoice deleted");
    },
    [sendDelete, pushHistory],
  );

  // ────────────────────────────── Payments ──────────────────────────────
  const addPayment = useCallback(
    (payment: Omit<Payment, "id">) => {
      const newPayment: Payment = { ...payment, id: generateId("p") };
      sendAdd("payments", newPayment);

      // ── Cascade: update invoice status, mark linked charges paid, post accounting ──
      const invoice = data.invoices.find((i) => i.id === payment.invoiceId);
      if (invoice) {
        const { updates, journalEntry } = paymentCascade(
          newPayment,
          invoice,
          data.chartOfAccounts,
          data.journalEntries.length,
        );
        for (const upd of updates) {
          if (upd.kind === "update" && upd.id && upd.patch) {
            sendUpdate(upd.collection as keyof DataStore, upd.id, upd.patch);
          }
        }
        // Post the payment journal entry
        if (journalEntry) {
          const je: JournalEntry = {
            ...journalEntry,
            id: generateId("je"),
            entryNumber: generateCode("JE", data.journalEntries.length),
          };
          sendAdd("journalEntries", je);
          sendUpdate("payments", newPayment.id, { journalEntryId: je.id });
          pushHistory({
            action: "Created" as HistoryAction,
            entityType: "Journal Entry",
            entityId: je.id,
            entityName: je.entryNumber,
            summary: `Auto-posted journal entry for payment ${newPayment.receiptNumber}`,
          });
        }
        pushHistory({
          action: "Edited" as HistoryAction,
          entityType: "Invoice",
          entityId: invoice.id,
          entityName: invoice.invoiceNumber,
          summary: `Invoice ${invoice.invoiceNumber} updated by payment ${newPayment.receiptNumber}`,
        });
      }

      pushHistory({
        action: "Created",
        entityType: "Payment",
        entityId: newPayment.id,
        entityName: newPayment.receiptNumber,
        summary: `Payment "${newPayment.receiptNumber}" recorded — invoice & accounting auto-updated`,
      });
      toast.success(`Payment "${newPayment.receiptNumber}" recorded — invoice & accounting auto-updated`);

      // ── Auto-email payment receipt to tenant (background) ──
      const tenant = data.tenants.find((t) => t.id === payment.tenantId);
      if (tenant?.email && invoice) {
        void sendPaymentReceiptEmail(newPayment, invoice, tenant).catch((err) => {
          console.error("[automation] receipt email failed", err);
        });
      }

      return newPayment;
    },
    [sendAdd, pushHistory, sendUpdate, data.invoices, data.chartOfAccounts, data.journalEntries.length, data.tenants],
  );

  const updatePayment = useCallback(
    (id: string, updates: Partial<Payment>) => {
      let changes: { field: string; from: string; to: string }[] = [];
      let name = "Payment";
      setData((prev) => {
        const existing = prev.payments.find((p) => p.id === id);
        if (!existing) return prev;
        name = existing.receiptNumber;
        changes = diffChanges(existing as unknown as Record<string, unknown>, updates as Record<string, unknown>);
        return prev;
      });
      sendUpdate("payments", id, updates as unknown as Record<string, unknown>);
      pushHistory({
        action: "Edited",
        entityType: "Payment",
        entityId: id,
        entityName: name,
        summary: `Payment "${name}" edited (${changes.length} field${changes.length === 1 ? "" : "s"} changed)`,
        changes,
      });
      toast.success("Payment updated");
    },
    [sendUpdate, pushHistory],
  );

  const deletePayment = useCallback(
    (id: string) => {
      let name = "Payment";
      let snapshot: Payment | undefined;
      setData((prev) => {
        const existing = prev.payments.find((p) => p.id === id);
        if (existing) { name = existing.receiptNumber; snapshot = existing; }
        return prev;
      });
      sendDelete("payments", id, snapshot as unknown as Record<string, unknown>);
      pushHistory({
        action: "Deleted",
        entityType: "Payment",
        entityId: id,
        entityName: name,
        summary: `Payment "${name}" deleted`,
        snapshot,
      });
      toast.success("Payment deleted");
    },
    [sendDelete, pushHistory],
  );

  // ────────────────────────────── Expenses ──────────────────────────────
  const addExpense = useCallback(
    (expense: Omit<Expense, "id">) => {
      const newExpense: Expense = { ...expense, id: generateId("e") };
      sendAdd("expenses", newExpense);
      pushHistory({
        action: "Created",
        entityType: "Expense",
        entityId: newExpense.id,
        entityName: newExpense.expenseNumber,
        summary: `Expense "${newExpense.expenseNumber}" created`,
      });
      toast.success(`Expense "${newExpense.expenseNumber}" created`);
      return newExpense;
    },
    [sendAdd, pushHistory],
  );

  const updateExpense = useCallback(
    (id: string, updates: Partial<Expense>) => {
      let changes: { field: string; from: string; to: string }[] = [];
      let name = "Expense";
      setData((prev) => {
        const existing = prev.expenses.find((e) => e.id === id);
        if (!existing) return prev;
        name = existing.expenseNumber;
        changes = diffChanges(existing as unknown as Record<string, unknown>, updates as Record<string, unknown>);
        return prev;
      });
      sendUpdate("expenses", id, updates as unknown as Record<string, unknown>);
      pushHistory({
        action: "Edited",
        entityType: "Expense",
        entityId: id,
        entityName: name,
        summary: `Expense "${name}" edited (${changes.length} field${changes.length === 1 ? "" : "s"} changed)`,
        changes,
      });
      toast.success("Expense updated");
    },
    [sendUpdate, pushHistory],
  );

  const deleteExpense = useCallback(
    (id: string) => {
      let name = "Expense";
      let snapshot: Expense | undefined;
      setData((prev) => {
        const existing = prev.expenses.find((e) => e.id === id);
        if (existing) { name = existing.expenseNumber; snapshot = existing; }
        return prev;
      });
      sendDelete("expenses", id, snapshot as unknown as Record<string, unknown>);
      pushHistory({
        action: "Deleted",
        entityType: "Expense",
        entityId: id,
        entityName: name,
        summary: `Expense "${name}" deleted`,
        snapshot,
      });
      toast.success("Expense deleted");
    },
    [sendDelete, pushHistory],
  );

  // ────────────────────────────── EWA Bills ──────────────────────────────
  const addEWABill = useCallback(
    (bill: Omit<EWABill, "id" | "billNumber" | "excess">) => {
      const excess = bill.billAmount - bill.limit;
      const newBill: EWABill = {
        ...bill,
        id: generateId("ewa"),
        billNumber: generateCode("EWA", data.ewaBills.length),
        excess,
      };
      sendAdd("ewaBills", newBill);
      pushHistory({
        action: "Created",
        entityType: "EWA Bill",
        entityId: newBill.id,
        entityName: newBill.billNumber,
        summary: `EWA bill "${newBill.billNumber}" logged`,
      });
      toast.success(`EWA bill "${newBill.billNumber}" logged`);
      return newBill;
    },
    [sendAdd, pushHistory, data.ewaBills.length],
  );

  const updateEWABill = useCallback(
    (id: string, updates: Partial<EWABill>) => {
      let changes: { field: string; from: string; to: string }[] = [];
      let name = "EWA Bill";
      setData((prev) => {
        const existing = prev.ewaBills.find((b) => b.id === id);
        if (!existing) return prev;
        name = existing.billNumber;
        const merged = { ...existing, ...updates, excess: (updates.billAmount ?? existing.billAmount) - (updates.limit ?? existing.limit) };
        changes = diffChanges(existing as unknown as Record<string, unknown>, merged as unknown as Record<string, unknown>);
        return prev;
      });
      // Recompute excess on the patch.
      setData((prev) => {
        const existing = prev.ewaBills.find((b) => b.id === id);
        if (!existing) return prev;
        const merged = { ...updates, excess: (updates.billAmount ?? existing.billAmount) - (updates.limit ?? existing.limit) } as Partial<EWABill>;
        sendUpdate("ewaBills", id, merged as unknown as Record<string, unknown>);
        return prev;
      });
      pushHistory({
        action: "Edited",
        entityType: "EWA Bill",
        entityId: id,
        entityName: name,
        summary: `EWA bill "${name}" edited (${changes.length} field${changes.length === 1 ? "" : "s"} changed)`,
        changes,
      });
      toast.success("EWA bill updated");
    },
    [sendUpdate, pushHistory],
  );

  const deleteEWABill = useCallback(
    (id: string) => {
      let name = "EWA Bill";
      let snapshot: EWABill | undefined;
      setData((prev) => {
        const existing = prev.ewaBills.find((b) => b.id === id);
        if (existing) { name = existing.billNumber; snapshot = existing; }
        return prev;
      });
      sendDelete("ewaBills", id, snapshot as unknown as Record<string, unknown>);
      pushHistory({
        action: "Deleted",
        entityType: "EWA Bill",
        entityId: id,
        entityName: name,
        summary: `EWA bill "${name}" deleted`,
        snapshot,
      });
      toast.success("EWA bill deleted");
    },
    [sendDelete, pushHistory],
  );

  // ────────────────────────────── Chart of Accounts ──────────────────────────────
  const addChartOfAccount = useCallback(
    (account: Omit<ChartOfAccount, "id">) => {
      const newAccount: ChartOfAccount = { ...account, id: generateId("coa") };
      sendAdd("chartOfAccounts", newAccount);
      pushHistory({
        action: "Created",
        entityType: "Chart of Account",
        entityId: newAccount.id,
        entityName: newAccount.name,
        summary: `Account "${newAccount.name}" created`,
      });
      toast.success(`Account "${newAccount.name}" created`);
      return newAccount;
    },
    [sendAdd, pushHistory],
  );

  const updateChartOfAccount = useCallback(
    (id: string, updates: Partial<ChartOfAccount>) => {
      let changes: { field: string; from: string; to: string }[] = [];
      let name = "Account";
      setData((prev) => {
        const existing = prev.chartOfAccounts.find((a) => a.id === id);
        if (!existing) return prev;
        name = existing.name;
        changes = diffChanges(existing as unknown as Record<string, unknown>, updates as Record<string, unknown>);
        return prev;
      });
      sendUpdate("chartOfAccounts", id, updates as unknown as Record<string, unknown>);
      pushHistory({
        action: "Edited",
        entityType: "Chart of Account",
        entityId: id,
        entityName: name,
        summary: `Account "${name}" edited (${changes.length} field${changes.length === 1 ? "" : "s"} changed)`,
        changes,
      });
      toast.success("Account updated");
    },
    [sendUpdate, pushHistory],
  );

  const deleteChartOfAccount = useCallback(
    (id: string) => {
      let name = "Account";
      let snapshot: ChartOfAccount | undefined;
      setData((prev) => {
        const existing = prev.chartOfAccounts.find((a) => a.id === id);
        if (existing) { name = existing.name; snapshot = existing; }
        return prev;
      });
      sendDelete("chartOfAccounts", id, snapshot as unknown as Record<string, unknown>);
      pushHistory({
        action: "Deleted",
        entityType: "Chart of Account",
        entityId: id,
        entityName: name,
        summary: `Account "${name}" deleted`,
        snapshot,
      });
      toast.success("Account deleted");
    },
    [sendDelete, pushHistory],
  );

  // ────────────────────────────── Journal Entries ──────────────────────────────
  const addJournalEntry = useCallback(
    (entry: Omit<JournalEntry, "id" | "entryNumber">) => {
      const newEntry: JournalEntry = { ...entry, id: generateId("je"), entryNumber: generateCode("JE", data.journalEntries.length) };
      sendAdd("journalEntries", newEntry);
      pushHistory({
        action: "Created",
        entityType: "Journal Entry",
        entityId: newEntry.id,
        entityName: newEntry.entryNumber,
        summary: `Journal entry "${newEntry.entryNumber}" posted`,
      });
      toast.success(`Journal entry "${newEntry.entryNumber}" posted`);
      return newEntry;
    },
    [sendAdd, pushHistory, data.journalEntries.length],
  );

  const updateJournalEntry = useCallback(
    (id: string, updates: Partial<JournalEntry>) => {
      let changes: { field: string; from: string; to: string }[] = [];
      let name = "Journal Entry";
      setData((prev) => {
        const existing = prev.journalEntries.find((j) => j.id === id);
        if (!existing) return prev;
        name = existing.entryNumber;
        changes = diffChanges(existing as unknown as Record<string, unknown>, updates as Record<string, unknown>);
        return prev;
      });
      sendUpdate("journalEntries", id, updates as unknown as Record<string, unknown>);
      pushHistory({
        action: "Edited",
        entityType: "Journal Entry",
        entityId: id,
        entityName: name,
        summary: `Journal entry "${name}" edited (${changes.length} field${changes.length === 1 ? "" : "s"} changed)`,
        changes,
      });
      toast.success("Journal entry updated");
    },
    [sendUpdate, pushHistory],
  );

  const deleteJournalEntry = useCallback(
    (id: string) => {
      let name = "Journal Entry";
      let snapshot: JournalEntry | undefined;
      setData((prev) => {
        const existing = prev.journalEntries.find((j) => j.id === id);
        if (existing) { name = existing.entryNumber; snapshot = existing; }
        return prev;
      });
      sendDelete("journalEntries", id, snapshot as unknown as Record<string, unknown>);
      pushHistory({
        action: "Deleted",
        entityType: "Journal Entry",
        entityId: id,
        entityName: name,
        summary: `Journal entry "${name}" deleted`,
        snapshot,
      });
      toast.success("Journal entry deleted");
    },
    [sendDelete, pushHistory],
  );

  // ────────────────────────────── Distributions ──────────────────────────────
  const addDistribution = useCallback(
    (distribution: Omit<Distribution, "id">) => {
      const newDistribution: Distribution = { ...distribution, id: generateId("d") };
      sendAdd("distributions", newDistribution);
      pushHistory({
        action: "Created",
        entityType: "Distribution",
        entityId: newDistribution.id,
        entityName: newDistribution.period,
        summary: `Distribution "${newDistribution.period}" created`,
      });
      toast.success(`Distribution "${newDistribution.period}" created`);
      return newDistribution;
    },
    [sendAdd, pushHistory],
  );

  const updateDistribution = useCallback(
    (id: string, updates: Partial<Distribution>) => {
      let changes: { field: string; from: string; to: string }[] = [];
      let name = "Distribution";
      setData((prev) => {
        const existing = prev.distributions.find((d) => d.id === id);
        if (!existing) return prev;
        name = existing.period;
        changes = diffChanges(existing as unknown as Record<string, unknown>, updates as Record<string, unknown>);
        return prev;
      });
      sendUpdate("distributions", id, updates as unknown as Record<string, unknown>);
      pushHistory({
        action: "Edited",
        entityType: "Distribution",
        entityId: id,
        entityName: name,
        summary: `Distribution "${name}" edited (${changes.length} field${changes.length === 1 ? "" : "s"} changed)`,
        changes,
      });
      toast.success("Distribution updated");
    },
    [sendUpdate, pushHistory],
  );

  const deleteDistribution = useCallback(
    (id: string) => {
      let name = "Distribution";
      let snapshot: Distribution | undefined;
      setData((prev) => {
        const existing = prev.distributions.find((d) => d.id === id);
        if (existing) { name = existing.period; snapshot = existing; }
        return prev;
      });
      sendDelete("distributions", id, snapshot as unknown as Record<string, unknown>);
      pushHistory({
        action: "Deleted",
        entityType: "Distribution",
        entityId: id,
        entityName: name,
        summary: `Distribution "${name}" deleted`,
        snapshot,
      });
      toast.success("Distribution deleted");
    },
    [sendDelete, pushHistory],
  );

  // ────────────────────────────── Vendors ──────────────────────────────
  const addVendor = useCallback(
    (vendor: Omit<Vendor, "id">) => {
      const newVendor: Vendor = { ...vendor, id: generateId("v") };
      sendAdd("vendors", newVendor);
      pushHistory({
        action: "Created",
        entityType: "Vendor",
        entityId: newVendor.id,
        entityName: newVendor.name,
        summary: `Vendor "${newVendor.name}" created`,
      });
      toast.success(`Vendor "${newVendor.name}" created`);
      return newVendor;
    },
    [sendAdd, pushHistory],
  );

  const updateVendor = useCallback(
    (id: string, updates: Partial<Vendor>) => {
      let changes: { field: string; from: string; to: string }[] = [];
      let name = "Vendor";
      setData((prev) => {
        const existing = prev.vendors.find((v) => v.id === id);
        if (!existing) return prev;
        name = existing.name;
        changes = diffChanges(existing as unknown as Record<string, unknown>, updates as Record<string, unknown>);
        return prev;
      });
      sendUpdate("vendors", id, updates as unknown as Record<string, unknown>);
      pushHistory({
        action: "Edited",
        entityType: "Vendor",
        entityId: id,
        entityName: name,
        summary: `Vendor "${name}" edited (${changes.length} field${changes.length === 1 ? "" : "s"} changed)`,
        changes,
      });
      toast.success("Vendor updated");
    },
    [sendUpdate, pushHistory],
  );

  const deleteVendor = useCallback(
    (id: string) => {
      let name = "Vendor";
      let snapshot: Vendor | undefined;
      setData((prev) => {
        const existing = prev.vendors.find((v) => v.id === id);
        if (existing) { name = existing.name; snapshot = existing; }
        return prev;
      });
      sendDelete("vendors", id, snapshot as unknown as Record<string, unknown>);
      pushHistory({
        action: "Deleted",
        entityType: "Vendor",
        entityId: id,
        entityName: name,
        summary: `Vendor "${name}" deleted`,
        snapshot,
      });
      toast.success("Vendor deleted");
    },
    [sendDelete, pushHistory],
  );

  // ────────────────────────────── Assets ──────────────────────────────
  const addAsset = useCallback(
    (asset: Omit<Asset, "id">) => {
      const newAsset: Asset = { ...asset, id: generateId("a") };
      sendAdd("assets", newAsset);
      pushHistory({
        action: "Created",
        entityType: "Asset",
        entityId: newAsset.id,
        entityName: newAsset.name,
        summary: `Asset "${newAsset.name}" created`,
      });
      toast.success(`Asset "${newAsset.name}" created`);
      return newAsset;
    },
    [sendAdd, pushHistory],
  );

  const updateAsset = useCallback(
    (id: string, updates: Partial<Asset>) => {
      let changes: { field: string; from: string; to: string }[] = [];
      let name = "Asset";
      setData((prev) => {
        const existing = prev.assets.find((a) => a.id === id);
        if (!existing) return prev;
        name = existing.name;
        changes = diffChanges(existing as unknown as Record<string, unknown>, updates as Record<string, unknown>);
        return prev;
      });
      sendUpdate("assets", id, updates as unknown as Record<string, unknown>);
      pushHistory({
        action: "Edited",
        entityType: "Asset",
        entityId: id,
        entityName: name,
        summary: `Asset "${name}" edited (${changes.length} field${changes.length === 1 ? "" : "s"} changed)`,
        changes,
      });
      toast.success("Asset updated");
    },
    [sendUpdate, pushHistory],
  );

  const deleteAsset = useCallback(
    (id: string) => {
      let name = "Asset";
      let snapshot: Asset | undefined;
      setData((prev) => {
        const existing = prev.assets.find((a) => a.id === id);
        if (existing) { name = existing.name; snapshot = existing; }
        return prev;
      });
      sendDelete("assets", id, snapshot as unknown as Record<string, unknown>);
      pushHistory({
        action: "Deleted",
        entityType: "Asset",
        entityId: id,
        entityName: name,
        summary: `Asset "${name}" deleted`,
        snapshot,
      });
      toast.success("Asset deleted");
    },
    [sendDelete, pushHistory],
  );

  // ────────────────────────────── Complaints ──────────────────────────────
  const addComplaint = useCallback(
    (complaint: Omit<Complaint, "id" | "ticketNumber">) => {
      const newComplaint: Complaint = { ...complaint, id: generateId("c"), ticketNumber: generateCode("CMP", data.complaints.length) };
      sendAdd("complaints", newComplaint);
      pushHistory({
        action: "Created",
        entityType: "Complaint",
        entityId: newComplaint.id,
        entityName: newComplaint.ticketNumber,
        summary: `Complaint "${newComplaint.ticketNumber}" created`,
      });
      toast.success(`Complaint "${newComplaint.ticketNumber}" created`);
      return newComplaint;
    },
    [sendAdd, pushHistory, data.complaints.length],
  );

  const updateComplaint = useCallback(
    (id: string, updates: Partial<Complaint>) => {
      let changes: { field: string; from: string; to: string }[] = [];
      let name = "Complaint";
      setData((prev) => {
        const existing = prev.complaints.find((c) => c.id === id);
        if (!existing) return prev;
        name = existing.ticketNumber;
        changes = diffChanges(existing as unknown as Record<string, unknown>, updates as Record<string, unknown>);
        return prev;
      });
      sendUpdate("complaints", id, updates as unknown as Record<string, unknown>);
      pushHistory({
        action: "Edited",
        entityType: "Complaint",
        entityId: id,
        entityName: name,
        summary: `Complaint "${name}" edited (${changes.length} field${changes.length === 1 ? "" : "s"} changed)`,
        changes,
      });
      toast.success("Complaint updated");
    },
    [sendUpdate, pushHistory],
  );

  const deleteComplaint = useCallback(
    (id: string) => {
      let name = "Complaint";
      let snapshot: Complaint | undefined;
      setData((prev) => {
        const existing = prev.complaints.find((c) => c.id === id);
        if (existing) { name = existing.ticketNumber; snapshot = existing; }
        return prev;
      });
      sendDelete("complaints", id, snapshot as unknown as Record<string, unknown>);
      pushHistory({
        action: "Deleted",
        entityType: "Complaint",
        entityId: id,
        entityName: name,
        summary: `Complaint "${name}" deleted`,
        snapshot,
      });
      toast.success("Complaint deleted");
    },
    [sendDelete, pushHistory],
  );

  // ────────────────────────────── Maintenance ──────────────────────────────
  const addMaintenanceRequest = useCallback(
    (request: Omit<MaintenanceRequest, "id" | "requestNumber">) => {
      const newRequest: MaintenanceRequest = { ...request, id: generateId("m"), requestNumber: generateCode("MNT", data.maintenanceRequests.length) };
      sendAdd("maintenanceRequests", newRequest);
      pushHistory({
        action: "Created",
        entityType: "Maintenance Request",
        entityId: newRequest.id,
        entityName: newRequest.requestNumber,
        summary: `Maintenance request "${newRequest.requestNumber}" created`,
      });
      toast.success(`Maintenance request "${newRequest.requestNumber}" created`);
      return newRequest;
    },
    [sendAdd, pushHistory, data.maintenanceRequests.length],
  );

  const updateMaintenanceRequest = useCallback(
    (id: string, updates: Partial<MaintenanceRequest>) => {
      let changes: { field: string; from: string; to: string }[] = [];
      let name = "Maintenance Request";
      setData((prev) => {
        const existing = prev.maintenanceRequests.find((m) => m.id === id);
        if (!existing) return prev;
        name = existing.requestNumber;
        changes = diffChanges(existing as unknown as Record<string, unknown>, updates as Record<string, unknown>);
        return prev;
      });
      sendUpdate("maintenanceRequests", id, updates as unknown as Record<string, unknown>);
      pushHistory({
        action: "Edited",
        entityType: "Maintenance Request",
        entityId: id,
        entityName: name,
        summary: `Maintenance request "${name}" edited (${changes.length} field${changes.length === 1 ? "" : "s"} changed)`,
        changes,
      });
      toast.success("Maintenance request updated");
    },
    [sendUpdate, pushHistory],
  );

  const deleteMaintenanceRequest = useCallback(
    (id: string) => {
      let name = "Maintenance Request";
      let snapshot: MaintenanceRequest | undefined;
      setData((prev) => {
        const existing = prev.maintenanceRequests.find((m) => m.id === id);
        if (existing) { name = existing.requestNumber; snapshot = existing; }
        return prev;
      });
      sendDelete("maintenanceRequests", id, snapshot as unknown as Record<string, unknown>);
      pushHistory({
        action: "Deleted",
        entityType: "Maintenance Request",
        entityId: id,
        entityName: name,
        summary: `Maintenance request "${name}" deleted`,
        snapshot,
      });
      toast.success("Maintenance request deleted");
    },
    [sendDelete, pushHistory],
  );

  // ────────────────────────────── Documents ──────────────────────────────
  const addDocument = useCallback(
    (document: Omit<Document, "id">) => {
      const newDocument: Document = { ...document, id: generateId("doc") };
      sendAdd("documents", newDocument);
      pushHistory({
        action: "Created",
        entityType: "Document",
        entityId: newDocument.id,
        entityName: newDocument.name,
        summary: `Document "${newDocument.name}" uploaded`,
      });
      toast.success(`Document "${newDocument.name}" uploaded`);
      return newDocument;
    },
    [sendAdd, pushHistory],
  );

  const updateDocument = useCallback(
    (id: string, updates: Partial<Document>) => {
      let changes: { field: string; from: string; to: string }[] = [];
      let name = "Document";
      setData((prev) => {
        const existing = prev.documents.find((d) => d.id === id);
        if (!existing) return prev;
        name = existing.name;
        changes = diffChanges(existing as unknown as Record<string, unknown>, updates as Record<string, unknown>);
        return prev;
      });
      sendUpdate("documents", id, updates as unknown as Record<string, unknown>);
      pushHistory({
        action: "Edited",
        entityType: "Document",
        entityId: id,
        entityName: name,
        summary: `Document "${name}" edited (${changes.length} field${changes.length === 1 ? "" : "s"} changed)`,
        changes,
      });
      toast.success("Document updated");
    },
    [sendUpdate, pushHistory],
  );

  const deleteDocument = useCallback(
    (id: string) => {
      let name = "Document";
      let snapshot: Document | undefined;
      setData((prev) => {
        const existing = prev.documents.find((d) => d.id === id);
        if (existing) { name = existing.name; snapshot = existing; }
        return prev;
      });
      sendDelete("documents", id, snapshot as unknown as Record<string, unknown>);
      pushHistory({
        action: "Deleted",
        entityType: "Document",
        entityId: id,
        entityName: name,
        summary: `Document "${name}" deleted`,
        snapshot,
      });
      toast.success("Document deleted");
    },
    [sendDelete, pushHistory],
  );

  const clearHistory = useCallback(() => {
    updateArray("history", () => []);
    syncClient.sendClearHistory(actorRef.current);
    toast.success("History cleared");
  }, [updateArray]);

  // ────────────────────────────── Recover ──────────────────────────────
  const recoverEntity = useCallback(
    (historyId: string) => {
      const entry = data.history.find((h) => h.id === historyId);
      if (!entry || entry.action !== "Deleted" || entry.recovered || !entry.snapshot) return;
      const collection = ENTITY_TYPE_TO_COLLECTION[entry.entityType];
      if (!collection) return;
      const snapshot = entry.snapshot as { id: string };
      const arr = data[collection] as { id: string }[];
      if (arr.some((item) => item.id === snapshot.id)) {
        toast.error(`${entry.entityType} already exists`);
        return;
      }
      // Optimistic: add the snapshot back + mark history as recovered.
      updateArray(collection, (list) => [...list, snapshot] as unknown as DataStore[typeof collection]);
      setData((prev) => ({
        ...prev,
        history: prev.history.map((h) => (h.id === historyId ? { ...h, recovered: true } : h)),
      }));
      // Push recover to the workspace (broadcasts to all clients).
      syncClient.sendRecover(historyId, actorRef.current);
      // Add a recover history entry.
      pushHistory({
        action: "Created",
        entityType: entry.entityType,
        entityId: entry.entityId,
        entityName: entry.entityName,
        summary: `${entry.entityType} "${entry.entityName}" recovered from deletion`,
      });
      toast.success("Record recovered");
    },
    [data, updateArray, pushHistory],
  );

  // ──────────────────────────── Automated Invoicing ────────────────────────────

  /** Company details used on invoice PDFs and email bodies. */
  const COMPANY_INFO = {
    name: "Al Namlaiti Property Management",
    email: "namlity@gmail.com",
    phone: "+973 3380 4311",
    address: "Manama, Kingdom of Bahrain",
  };

  /** Build a PdfContext for a given invoice (used for preview/download/email). */
  const buildPdfContext = useCallback(
    (invoice: Invoice): PdfContext => {
      const tenant = data.tenants.find((t) => t.id === invoice.tenantId);
      const unit = data.units.find((u) => u.id === invoice.unitId);
      const building = unit ? data.buildings.find((b) => b.id === unit.buildingId) : undefined;
      return {
        invoice,
        tenant,
        unit,
        building,
        companyName: COMPANY_INFO.name,
        companyEmail: COMPANY_INFO.email,
        companyPhone: COMPANY_INFO.phone,
        companyAddress: COMPANY_INFO.address,
      };
    },
    [data.tenants, data.units, data.buildings],
  );

  /** Post the accounting journal entry for an invoice and return the entry id. */
  const postInvoiceJournal = useCallback(
    (invoice: Invoice): string | undefined => {
      const { entry } = buildInvoiceJournalEntry(
        invoice,
        data.chartOfAccounts,
        data.journalEntries.length,
      );
      const journalEntry: JournalEntry = {
        ...entry,
        id: generateId("je"),
        entryNumber: generateCode("JE", data.journalEntries.length),
      };
      sendAdd("journalEntries", journalEntry);
      pushHistory({
        action: "Created" as HistoryAction,
        entityType: "Journal Entry",
        entityId: journalEntry.id,
        entityName: journalEntry.entryNumber,
        summary: `Auto-posted journal entry for invoice ${invoice.invoiceNumber}`,
      });
      return journalEntry.id;
    },
    [sendAdd, pushHistory, data.chartOfAccounts, data.journalEntries.length],
  );

  /** Generate invoices for all active leases for a given billing period. */
  const generateMonthlyInvoices = useCallback(
    async (periodKey?: string): Promise<{ generated: number; skipped: number; errors: string[] }> => {
      const pk = periodKey ?? toPeriodKey(new Date());
      const activeLeases = data.leases.filter((l) => l.status === "Active");
      const errors: string[] = [];
      let generated = 0;
      let skipped = 0;

      for (const lease of activeLeases) {
        // Prevent duplicate generation
        if (invoiceExistsForPeriod(data.invoices, lease.id, pk)) {
          skipped++;
          continue;
        }

        const tenant = data.tenants.find((t) => t.id === lease.tenantId);
        if (!tenant) {
          errors.push(`Lease ${lease.contractNumber}: tenant not found`);
          continue;
        }

        // Resolve the unit's building id so building-level expenses are matched.
        const unit = data.units.find((u) => u.id === lease.unitId);
        const unitBuildingId = unit?.buildingId ?? "";

        const calc = calculateInvoice({
          lease,
          ewaBills: data.ewaBills,
          maintenanceRequests: data.maintenanceRequests,
          expenses: data.expenses,
          previousInvoices: data.invoices,
          periodKey: pk,
          unitBuildingId,
        });

        if (calc.total <= 0) {
          skipped++;
          continue;
        }

        const issueDate = new Date();
        const invoiceNumber = generateInvoiceNumber(data.invoices.length + generated);
        const newInvoice: Invoice = {
          id: generateId("inv"),
          invoiceNumber,
          tenantId: tenant.id,
          leaseId: lease.id,
          unitId: lease.unitId,
          issueDate: toISODate(issueDate),
          dueDate: computeDueDate(issueDate),
          periodFrom: `${pk}-01`,
          periodTo: `${pk}-28`,
          amount: calc.total,
          balance: calc.total,
          status: "Sent",
          lineItems: calc.lineItems,
          rentAmount: calc.rentAmount,
          ewaAmount: calc.ewaAmount,
          maintenanceAmount: calc.maintenanceAmount,
          otherExpensesAmount: calc.otherExpensesAmount,
          previousBalance: calc.previousBalance,
          taxRate: 0,
          taxAmount: calc.taxAmount,
          emailStatus: "Not Sent",
          generatedAutomatically: true,
          ewaBillIds: calc.ewaBillIds,
          expenseIds: calc.expenseIds,
          maintenanceIds: calc.maintenanceIds,
          paymentInstructions: `Please transfer the total amount to ${COMPANY_INFO.name} bank account within 5 days of the due date. For questions, contact ${COMPANY_INFO.email}.`,
        };

        sendAdd("invoices", newInvoice);
        const jeId = postInvoiceJournal(newInvoice);
        if (jeId) {
          sendUpdate("invoices", newInvoice.id, { journalEntryId: jeId });
        }

        // ── Cascade: mark linked EWA/Expenses/Maintenance as Invoiced ──
        const cascade = invoiceCascade(newInvoice);
        for (const upd of cascade) {
          if (upd.kind === "update" && upd.id && upd.patch) {
            sendUpdate(upd.collection as keyof DataStore, upd.id, upd.patch);
          }
        }

        pushHistory({
          action: "Created" as HistoryAction,
          entityType: "Invoice",
          entityId: newInvoice.id,
          entityName: newInvoice.invoiceNumber,
          summary: `Invoice ${invoiceNumber} auto-generated for ${tenant.name} (${pk}) — EWA/Expenses/Maintenance marked invoiced`,
        });
        generated++;

        // ── Auto-email the invoice to the tenant (background, non-blocking) ──
        if (tenant.email) {
          void sendInvoice(newInvoice.id).catch((err) => {
            console.error("[automation] auto-email failed for", invoiceNumber, err);
          });
        }
      }

      if (generated > 0) {
        toast.success(`${generated} invoice(s) generated for ${pk}`);
      }
      if (skipped > 0) {
        toast.info(`${skipped} lease(s) skipped (already invoiced or zero amount)`);
      }
      if (errors.length > 0) {
        toast.error(`${errors.length} error(s) during generation`);
      }

      return { generated, skipped, errors };
    },
    [data.leases, data.tenants, data.ewaBills, data.maintenanceRequests, data.expenses, data.invoices, data.chartOfAccounts, data.journalEntries.length, sendAdd, sendUpdate, pushHistory, postInvoiceJournal],
  );

  /** Send a single invoice via email (updates emailStatus). */
  const sendInvoice = useCallback(
    async (invoiceId: string): Promise<boolean> => {
      const invoice = data.invoices.find((i) => i.id === invoiceId);
      if (!invoice) return false;

      // Mark as queued
      sendUpdate("invoices", invoiceId, { emailStatus: "Queued" });

      const ctx = buildPdfContext(invoice);
      const result = await sendInvoiceEmail(ctx);

      if (result.success) {
        sendUpdate("invoices", invoiceId, {
          emailStatus: "Sent",
          emailSentAt: nowISO(),
          emailError: undefined,
          status: invoice.status === "Draft" || invoice.status === "Overdue" ? "Sent" : invoice.status,
        });
        pushHistory({
          action: "Edited" as HistoryAction,
          entityType: "Invoice",
          entityId: invoiceId,
          entityName: invoice.invoiceNumber,
          summary: `Invoice ${invoice.invoiceNumber} emailed to tenant`,
        });
        toast.success(`Invoice ${invoice.invoiceNumber} sent`);
        return true;
      } else {
        sendUpdate("invoices", invoiceId, {
          emailStatus: "Failed",
          emailError: result.message,
        });
        pushHistory({
          action: "Edited" as HistoryAction,
          entityType: "Invoice",
          entityId: invoiceId,
          entityName: invoice.invoiceNumber,
          summary: `Email send failed for ${invoice.invoiceNumber}: ${result.message}`,
        });
        toast.error(`Failed to send ${invoice.invoiceNumber}: ${result.message}`);
        return false;
      }
    },
    [data.invoices, sendUpdate, pushHistory, buildPdfContext],
  );

  /** Batch-send all Draft/Sent invoices via email (queued in background). */
  const sendAllInvoices = useCallback(
    async (filter?: (inv: Invoice) => boolean): Promise<{ sent: number; failed: number }> => {
      const toSend = data.invoices.filter(
        (i) =>
          (i.status === "Draft" || i.status === "Sent" || i.status === "Overdue") &&
          (!filter || filter(i)),
      );

      let sent = 0;
      let failed = 0;

      // Process sequentially to avoid overwhelming the email API
      for (const invoice of toSend) {
        const ok = await sendInvoice(invoice.id);
        if (ok) sent++;
        else failed++;
      }

      if (sent > 0) toast.success(`${sent} invoice(s) sent`);
      if (failed > 0) toast.error(`${failed} invoice(s) failed to send`);
      return { sent, failed };
    },
    [data.invoices, sendInvoice],
  );

  /** Mark invoice as Paid and post accounting + update balance. */
  const markInvoicePaid = useCallback(
    (invoiceId: string, paymentAmount?: number) => {
      const invoice = data.invoices.find((i) => i.id === invoiceId);
      if (!invoice) return;

      const amount = paymentAmount ?? invoice.balance;
      const newBalance = Math.max(0, invoice.balance - amount);
      const newStatus = newBalance === 0 ? "Paid" : "Partial";

      sendUpdate("invoices", invoiceId, {
        balance: newBalance,
        status: newStatus,
      });

      // Record the payment
      const payment: Payment = {
        id: generateId("p"),
        receiptNumber: generateCode("RCP", data.payments.length),
        invoiceId,
        tenantId: invoice.tenantId,
        amount,
        paymentDate: toISODate(new Date()),
        method: "Bank Transfer",
        notes: "Auto-recorded via Mark Paid action",
      };
      sendAdd("payments", payment);

      pushHistory({
        action: "Edited" as HistoryAction,
        entityType: "Invoice",
        entityId: invoiceId,
        entityName: invoice.invoiceNumber,
        summary: `Invoice ${invoice.invoiceNumber} marked ${newStatus} (payment ${payment.receiptNumber})`,
      });
      toast.success(`Invoice ${invoice.invoiceNumber} marked ${newStatus}`);
    },
    [data.invoices, data.payments.length, sendUpdate, sendAdd, pushHistory],
  );

  /** Void/Cancel an invoice. */
  const voidInvoice = useCallback(
    (invoiceId: string) => {
      const invoice = data.invoices.find((i) => i.id === invoiceId);
      if (!invoice) return;
      sendUpdate("invoices", invoiceId, { status: "Cancelled", balance: 0 });
      pushHistory({
        action: "Edited" as HistoryAction,
        entityType: "Invoice",
        entityId: invoiceId,
        entityName: invoice.invoiceNumber,
        summary: `Invoice ${invoice.invoiceNumber} voided/cancelled`,
      });
      toast.success(`Invoice ${invoice.invoiceNumber} voided`);
    },
    [data.invoices, sendUpdate, pushHistory],
  );

  /** Mark all unpaid, past-due invoices as Overdue. */
  const updateOverdueInvoices = useCallback(() => {
    const today = new Date();
    let count = 0;
    data.invoices.forEach((inv) => {
      if (
        (inv.status === "Sent" || inv.status === "Partial" || inv.status === "Draft") &&
        inv.balance > 0 &&
        new Date(inv.dueDate) < today
      ) {
        sendUpdate("invoices", inv.id, { status: "Overdue" });
        pushHistory({
          action: "Edited" as HistoryAction,
          entityType: "Invoice",
          entityId: inv.id,
          entityName: inv.invoiceNumber,
          summary: `Invoice ${inv.invoiceNumber} automatically marked overdue`,
        });
        count++;
      }
    });
    if (count > 0) {
      toast.info(`${count} invoice(s) marked overdue`);
    }
    return count;
  }, [data.invoices, sendUpdate, pushHistory]);

  // Auto-run overdue check on data load
  useEffect(() => {
    if (data.invoices.length > 0) {
      const today = new Date();
      const hasOverdue = data.invoices.some(
        (inv) =>
          (inv.status === "Sent" || inv.status === "Partial") &&
          inv.balance > 0 &&
          new Date(inv.dueDate) < today,
      );
      if (hasOverdue) {
        updateOverdueInvoices();
      }
    }
  }, [data.invoices, updateOverdueInvoices]);

  // ────────────────────────────── Lookups ──────────────────────────────
  const getOwnerById = useCallback((id: string) => data.owners.find((o) => o.id === id), [data.owners]);
  const getBuildingById = useCallback((id: string) => data.buildings.find((b) => b.id === id), [data.buildings]);
  const getUnitById = useCallback((id: string) => data.units.find((u) => u.id === id), [data.units]);
  const getTenantById = useCallback((id: string) => data.tenants.find((t) => t.id === id), [data.tenants]);
  const getLeaseById = useCallback((id: string) => data.leases.find((l) => l.id === id), [data.leases]);
  const getInvoiceById = useCallback((id: string) => data.invoices.find((i) => i.id === id), [data.invoices]);
  const getChartOfAccountById = useCallback((id: string) => data.chartOfAccounts.find((a) => a.id === id), [data.chartOfAccounts]);
  const getJournalEntryById = useCallback((id: string) => data.journalEntries.find((j) => j.id === id), [data.journalEntries]);
  const getDistributionById = useCallback((id: string) => data.distributions.find((d) => d.id === id), [data.distributions]);
  const getBuildingUnits = useCallback(
    (buildingId: string) => data.units.filter((u) => u.buildingId === buildingId),
    [data.units],
  );
  const getTenantLeases = useCallback(
    (tenantId: string) => data.leases.filter((l) => l.tenantId === tenantId),
    [data.leases],
  );
  const getUnitLease = useCallback(
    (unitId: string) => data.leases.find((l) => l.unitId === unitId && l.status === "Active"),
    [data.leases],
  );
  const getInvoicePayments = useCallback(
    (invoiceId: string) => data.payments.filter((p) => p.invoiceId === invoiceId),
    [data.payments],
  );
  const getDocumentById = useCallback((id: string) => data.documents.find((d) => d.id === id), [data.documents]);

  return {
    ...data,
    connectionStatus,
    actorLabel: actorRef.current,
    addOwner,
    updateOwner,
    deleteOwner,
    addBuilding,
    updateBuilding,
    deleteBuilding,
    addUnit,
    updateUnit,
    deleteUnit,
    addTenant,
    updateTenant,
    deleteTenant,
    addLease,
    updateLease,
    deleteLease,
    addInvoice,
    updateInvoice,
    deleteInvoice,
    addPayment,
    updatePayment,
    deletePayment,
    addExpense,
    updateExpense,
    deleteExpense,
    addVendor,
    updateVendor,
    deleteVendor,
    addAsset,
    updateAsset,
    deleteAsset,
    addComplaint,
    updateComplaint,
    deleteComplaint,
    addMaintenanceRequest,
    updateMaintenanceRequest,
    deleteMaintenanceRequest,
    getOwnerById,
    getBuildingById,
    getUnitById,
    getTenantById,
    getLeaseById,
    getInvoiceById,
    getBuildingUnits,
    getTenantLeases,
    getUnitLease,
    getInvoicePayments,
    addEWABill,
    updateEWABill,
    deleteEWABill,
    addChartOfAccount,
    updateChartOfAccount,
    deleteChartOfAccount,
    addJournalEntry,
    updateJournalEntry,
    deleteJournalEntry,
    addDistribution,
    updateDistribution,
    deleteDistribution,
    getChartOfAccountById,
    getJournalEntryById,
    getDistributionById,
    addDocument,
    updateDocument,
    deleteDocument,
    getDocumentById,
    clearHistory,
    recoverEntity,
    // Automated invoicing
    generateMonthlyInvoices,
    sendInvoice,
    sendAllInvoices,
    markInvoicePaid,
    voidInvoice,
    updateOverdueInvoices,
    buildPdfContext,
    companyInfo: COMPANY_INFO,
  };
});
