import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  EWAAccount,
  EWADistribution,
  Expense,
  HistoryAction,
  HistoryEntry,
  Invoice,
  JournalEntry,
  Lease,
  LeaseAgreement,
  LeaseTemplateField,
  MaintenanceRequest,
  Owner,
  Payment,
  Tenant,
  Unit,
  Vendor,
  WhatsAppLog,
  WhatsAppSettings,
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
import {
  sendInvoiceWhatsApp,
  testWhatsAppConnection,
  whatsappAlreadySent,
  normalizePhoneNumber,
} from "@/lib/whatsappClient";
import type { PdfContext } from "@/lib/pdfGenerator";
import { leaseCascade, invoiceCascade, paymentCascade } from "@/lib/automation";
import { computeAllocation, validateLinkedUnits, validatePercentageRules } from "@/lib/ewaAllocation";
import {
  generateLeaseAgreementPdf,
  getLeaseAgreementTemplateVersion,
  validateLeaseAgreementFields,
  buildFieldConfigMap,
  getLeaseTemplateId,
  ALL_FIELD_KEYS,
  FIELD_LABELS,
  DEFAULT_FIELD_CONFIGS,
  type LeaseAgreementContext,
  type LeaseTemplateFieldConfig,
} from "@/lib/leaseAgreementGenerator";

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
  ewaAccounts: EWAAccount[];
  ewaDistributions: EWADistribution[];
  complaints: Complaint[];
  maintenanceRequests: MaintenanceRequest[];
  vendors: Vendor[];
  assets: Asset[];
  documents: Document[];
  leaseAgreements: LeaseAgreement[];
  whatsappLogs: WhatsAppLog[];
  whatsappSettings: WhatsAppSettings[];
  leaseTemplateFields: LeaseTemplateField[];
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
  ewaAccounts: [],
  ewaDistributions: [],
  complaints: [],
  maintenanceRequests: [],
  vendors: [],
  assets: [],
  documents: [],
  leaseAgreements: [],
  whatsappLogs: [],
  whatsappSettings: [],
  leaseTemplateFields: [],
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
  "EWA Account": "ewaAccounts",
  "EWA Distribution": "ewaDistributions",
  "Chart of Account": "chartOfAccounts",
  "Journal Entry": "journalEntries",
  Distribution: "distributions",
  Vendor: "vendors",
  Asset: "assets",
  Complaint: "complaints",
  "Maintenance Request": "maintenanceRequests",
  Document: "documents",
  "Lease Agreement": "leaseAgreements",
  "WhatsApp Log": "whatsappLogs",
  "WhatsApp Settings": "whatsappSettings",
  "Lease Template Field": "leaseTemplateFields",
};

export const [DataProvider, useData] = createContextHook(() => {
  const [data, setData] = useState<DataStore>(EMPTY_STORE);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("connecting");
  const actorRef = useRef<string>(typeof window === "undefined" ? "Guest-local" : getActorLabel());
  // Track the most recent history entry id we sent locally, so we don't
  // double-apply history entries echoed back from the server.
  const localHistoryEchoGuard = useRef<Set<string>>(new Set());
  // Used to seed default lease template field positions exactly once per session.
  const leaseTemplateFieldsSeeded = useRef(false);

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

  // Seed default lease template field positions once when the shared workspace is empty.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (connectionStatus !== "connected") return;
    if (leaseTemplateFieldsSeeded.current) return;
    if (data.leaseTemplateFields.length > 0) {
      leaseTemplateFieldsSeeded.current = true;
      return;
    }

    leaseTemplateFieldsSeeded.current = true;
    const templateId = getLeaseTemplateId();
    for (const key of ALL_FIELD_KEYS) {
      const def = DEFAULT_FIELD_CONFIGS[key];
      const field: LeaseTemplateField = {
        id: generateId("ltf"),
        templateId,
        fieldKey: key,
        x: def.x,
        y: def.y,
        width: def.width,
        height: def.height,
        fontSize: def.fontSize,
        fontFamily: def.fontFamily,
        textAlign: def.textAlign,
        isActive: true,
      };
      sendAdd("leaseTemplateFields", field);
    }
  }, [connectionStatus, data.leaseTemplateFields, sendAdd]);

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
  const buildLeaseAgreementContext = useCallback(
    (lease: Lease): LeaseAgreementContext | null => {
      const tenant = data.tenants.find((t) => t.id === lease.tenantId);
      const unit = data.units.find((u) => u.id === lease.unitId);
      const building = unit ? data.buildings.find((b) => b.id === unit.buildingId) : undefined;
      if (!tenant || !unit || !building) return null;
      return { lease, tenant, unit, building };
    },
    [data.tenants, data.units, data.buildings],
  );

  const fieldConfigs = useMemo(
    () => buildFieldConfigMap(data.leaseTemplateFields),
    [data.leaseTemplateFields],
  );

  const persistLeaseAgreement = useCallback(
    async (lease: Lease, isRegeneration = false) => {
      const ctx = buildLeaseAgreementContext(lease);
      if (!ctx) {
        toast.error("Could not generate lease agreement: missing tenant, unit, or building data");
        return;
      }

      const existing = data.leaseAgreements.find((a) => a.leaseId === lease.id);
      const agreementId = existing?.id ?? generateId("la");
      const status: LeaseAgreement["status"] = "Generating";

      const agreement: LeaseAgreement = {
        id: agreementId,
        leaseId: lease.id,
        building: ctx.building.name,
        flat: ctx.unit.unitNumber,
        tenant: ctx.tenant.name,
        rentAmount: ctx.lease.monthlyRent,
        startDate: ctx.lease.startDate,
        endDate: ctx.lease.endDate,
        templateVersion: getLeaseAgreementTemplateVersion(),
        generatedAt: new Date().toISOString(),
        generatedBy: actorRef.current,
        status,
      };

      const previousDocumentId = existing?.documentId;
      if (existing) {
        sendUpdate("leaseAgreements", agreementId, {
          ...agreement,
          previousDocumentId,
        } as unknown as Record<string, unknown>);
      } else {
        sendAdd("leaseAgreements", agreement);
      }

      // Update the lease to point to the latest agreement.
      sendUpdate("leases", lease.id, { agreementId } as unknown as Record<string, unknown>);

      try {
        const validation = validateLeaseAgreementFields(ctx);
        if (validation.length > 0) {
          const missing = validation.map((v) => v.message).join("; ");
          sendUpdate("leaseAgreements", agreementId, {
            status: "Failed",
            lastError: missing,
          } as unknown as Record<string, unknown>);
          toast.error(`Lease agreement missing fields: ${missing}`);
          return;
        }

        const doc = await generateLeaseAgreementPdf(ctx, fieldConfigs);
        const fileUrl = doc.output("datauristring");
        const documentId = generateId("doc");
        const docRecord: Document = {
          id: documentId,
          name: `${lease.contractNumber} - Lease Agreement`,
          type: "PDF",
          entityType: "Lease",
          entityId: lease.id,
          uploadDate: agreement.generatedAt,
          fileUrl,
        };
        sendAdd("documents", docRecord);

        sendUpdate("leaseAgreements", agreementId, {
          status: "Generated",
          documentId,
          previousDocumentId,
          lastError: undefined,
        } as unknown as Record<string, unknown>);
      } catch (err) {
        const message = err instanceof Error ? err.message : "PDF generation failed";
        sendUpdate("leaseAgreements", agreementId, {
          status: "Failed",
          lastError: message,
        } as unknown as Record<string, unknown>);
        toast.error(`Lease agreement generation failed: ${message}`);
      }
    },
    [buildLeaseAgreementContext, data.leaseAgreements, sendAdd, sendUpdate, fieldConfigs],
  );

  const regenerateLeaseAgreement = useCallback(
    (lease: Lease) => {
      persistLeaseAgreement(lease, true);
      toast.info("Regenerating lease agreement...");
    },
    [persistLeaseAgreement],
  );

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
      // ── Automatic lease agreement generation (non-blocking) ──
      persistLeaseAgreement(newLease, false);
      toast.success(`Lease "${newLease.contractNumber}" created — unit & tenant auto-linked`);
      return newLease;
    },
    [sendAdd, pushHistory, sendUpdate, persistLeaseAgreement, data.units, data.tenants, data.buildings],
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
      // ── Lease agreement: if key fields changed, mark as Needs Regeneration ──
      if (updatedLease) {
        const relevantFields: (keyof Lease)[] = ["tenantId", "unitId", "monthlyRent", "startDate", "endDate", "road", "block", "buildingNumber", "location"];
        const changedRelevant = relevantFields.some((f) => changes.some((c) => c.field === f));
        if (changedRelevant) {
          const existingAgreement = data.leaseAgreements.find((a) => a.leaseId === id);
          if (existingAgreement && existingAgreement.status === "Generated") {
            sendUpdate("leaseAgreements", existingAgreement.id, {
              status: "Needs Regeneration",
            } as unknown as Record<string, unknown>);
          }
        }
      }
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

  // ────────────────────────────── EWA Accounts (shared meters) ──────────────────────────────
  const addEWAAccount = useCallback(
    (account: Omit<EWAAccount, "id" | "createdAt">) => {
      const newAccount: EWAAccount = {
        ...account,
        id: generateId("ewacc"),
        createdAt: nowISO(),
      };
      // Validate before persisting.
      const linkErrors = validateLinkedUnits(newAccount, data.ewaAccounts, data.units);
      const ruleErrors = validatePercentageRules(newAccount);
      const errors = [...linkErrors, ...ruleErrors];
      if (errors.length > 0) {
        toast.error(errors[0]);
        return newAccount;
      }
      sendAdd("ewaAccounts", newAccount);
      pushHistory({
        action: "Created",
        entityType: "EWA Account",
        entityId: newAccount.id,
        entityName: newAccount.accountNumber,
        summary: `EWA account "${newAccount.accountNumber}" created — ${newAccount.linkedUnitIds.length} unit(s) linked, method: ${newAccount.allocationMethod}`,
      });
      toast.success(`EWA account "${newAccount.accountNumber}" created`);
      return newAccount;
    },
    [sendAdd, pushHistory, data.ewaAccounts, data.units],
  );

  const updateEWAAccount = useCallback(
    (id: string, updates: Partial<EWAAccount>) => {
      let changes: { field: string; from: string; to: string }[] = [];
      let name = "EWA Account";
      let merged: EWAAccount | undefined;
      setData((prev) => {
        const existing = prev.ewaAccounts.find((a) => a.id === id);
        if (!existing) return prev;
        name = existing.accountNumber;
        merged = { ...existing, ...updates };
        changes = diffChanges(existing as unknown as Record<string, unknown>, merged as unknown as Record<string, unknown>);
        return prev;
      });
      // Validate merged result.
      if (merged) {
        const linkErrors = validateLinkedUnits(merged, data.ewaAccounts, data.units);
        const ruleErrors = validatePercentageRules(merged);
        const errors = [...linkErrors, ...ruleErrors];
        if (errors.length > 0) {
          toast.error(errors[0]);
          return;
        }
      }
      sendUpdate("ewaAccounts", id, updates as unknown as Record<string, unknown>);
      pushHistory({
        action: "Edited",
        entityType: "EWA Account",
        entityId: id,
        entityName: name,
        summary: `EWA account "${name}" edited (${changes.length} field${changes.length === 1 ? "" : "s"} changed)`,
        changes,
      });
      toast.success("EWA account updated");
    },
    [sendUpdate, pushHistory, data.ewaAccounts, data.units],
  );

  const deleteEWAAccount = useCallback(
    (id: string) => {
      let name = "EWA Account";
      let snapshot: EWAAccount | undefined;
      setData((prev) => {
        const existing = prev.ewaAccounts.find((a) => a.id === id);
        if (existing) { name = existing.accountNumber; snapshot = existing; }
        return prev;
      });
      sendDelete("ewaAccounts", id, snapshot as unknown as Record<string, unknown>);
      pushHistory({
        action: "Deleted",
        entityType: "EWA Account",
        entityId: id,
        entityName: name,
        summary: `EWA account "${name}" deleted`,
        snapshot,
      });
      toast.success("EWA account deleted");
    },
    [sendDelete, pushHistory],
  );

  // ────────────────────────────── EWA Distributions ──────────────────────────────

  /**
   * Enter a monthly EWA bill for a shared account and compute each linked
   * unit's share. Stores a draft EWA Distribution (no per-unit bills yet).
   * Returns the created distribution, or undefined on error.
   */
  const createEWADistribution = useCallback(
    (input: {
      accountId: string;
      month: string;
      totalAmount: number;
      dueDate: string;
      notes?: string;
    }): EWADistribution | undefined => {
      const account = data.ewaAccounts.find((a) => a.id === input.accountId);
      if (!account) {
        toast.error("EWA account not found");
        return undefined;
      }
      if (input.totalAmount <= 0) {
        toast.error("Total amount must be greater than zero");
        return undefined;
      }
      // Prevent duplicate distribution for the same account + month.
      const existing = data.ewaDistributions.find(
        (d) => d.accountId === input.accountId && d.month === input.month,
      );
      if (existing) {
        toast.error(`A distribution already exists for ${input.month}`);
        return undefined;
      }

      const result = computeAllocation({
        account,
        totalAmount: input.totalAmount,
        units: data.units,
        leases: data.leases,
        tenants: data.tenants,
      });

      const billNumber = generateCode(`EWA-${account.accountNumber}`, data.ewaDistributions.length);
      const dist: EWADistribution = {
        id: generateId("ewadist"),
        accountId: input.accountId,
        billNumber,
        month: input.month,
        totalAmount: input.totalAmount,
        allocatedAmount: result.allocatedAmount,
        remainingBalance: result.remainingBalance,
        dueDate: input.dueDate,
        status: "Draft",
        allocations: result.allocations,
        enteredAt: nowISO(),
        notes: input.notes,
      };
      sendAdd("ewaDistributions", dist);
      pushHistory({
        action: "Created",
        entityType: "EWA Distribution",
        entityId: dist.id,
        entityName: dist.billNumber,
        summary: `EWA distribution "${dist.billNumber}" entered for ${input.month} — ${result.allocatedAmount.toFixed(2)} BHD allocated across ${result.allocations.filter((a) => !a.excluded).length} unit(s)`,
      });
      if (result.warnings.length > 0) {
        toast.info(result.warnings[0]);
      }
      toast.success(`EWA distribution created — ${result.allocatedAmount.toFixed(2)} BHD to ${result.allocations.filter((a) => !a.excluded && !a.chargeToLandlord).length} tenant(s)`);
      return dist;
    },
    [data.ewaAccounts, data.ewaDistributions, data.units, data.leases, data.tenants, sendAdd, pushHistory],
  );

  const updateEWADistribution = useCallback(
    (id: string, updates: Partial<EWADistribution>) => {
      let changes: { field: string; from: string; to: string }[] = [];
      let name = "EWA Distribution";
      setData((prev) => {
        const existing = prev.ewaDistributions.find((d) => d.id === id);
        if (!existing) return prev;
        name = existing.billNumber;
        changes = diffChanges(existing as unknown as Record<string, unknown>, updates as unknown as Record<string, unknown>);
        return prev;
      });
      sendUpdate("ewaDistributions", id, updates as unknown as Record<string, unknown>);
      pushHistory({
        action: "Edited",
        entityType: "EWA Distribution",
        entityId: id,
        entityName: name,
        summary: `EWA distribution "${name}" edited (${changes.length} field${changes.length === 1 ? "" : "s"} changed)`,
        changes,
      });
      toast.success("EWA distribution updated");
    },
    [sendUpdate, pushHistory],
  );

  const deleteEWADistribution = useCallback(
    (id: string) => {
      let name = "EWA Distribution";
      let snapshot: EWADistribution | undefined;
      setData((prev) => {
        const existing = prev.ewaDistributions.find((d) => d.id === id);
        if (existing) { name = existing.billNumber; snapshot = existing; }
        return prev;
      });
      sendDelete("ewaDistributions", id, snapshot as unknown as Record<string, unknown>);
      pushHistory({
        action: "Deleted",
        entityType: "EWA Distribution",
        entityId: id,
        entityName: name,
        summary: `EWA distribution "${name}" deleted`,
        snapshot,
      });
      toast.success("EWA distribution deleted");
    },
    [sendDelete, pushHistory],
  );

  /**
   * Recalculate an existing distribution's allocations (e.g. after the
   * account's allocation method or rules changed). Only allowed while the
   * distribution is still Draft (not yet processed into per-unit bills).
   */
  const recalculateEWADistribution = useCallback(
    (id: string): EWADistribution | undefined => {
      const dist = data.ewaDistributions.find((d) => d.id === id);
      if (!dist) return undefined;
      if (dist.status === "Distributed") {
        toast.error("Cannot recalculate a distribution that has already been processed. Delete and recreate it instead.");
        return undefined;
      }
      const account = data.ewaAccounts.find((a) => a.id === dist.accountId);
      if (!account) {
        toast.error("Linked EWA account no longer exists");
        return undefined;
      }
      const result = computeAllocation({
        account,
        totalAmount: dist.totalAmount,
        units: data.units,
        leases: data.leases,
        tenants: data.tenants,
      });
      const updated: Partial<EWADistribution> = {
        allocations: result.allocations,
        allocatedAmount: result.allocatedAmount,
        remainingBalance: result.remainingBalance,
        status: "Recalculated",
      };
      sendUpdate("ewaDistributions", id, updated as unknown as Record<string, unknown>);
      pushHistory({
        action: "Edited" as HistoryAction,
        entityType: "EWA Distribution",
        entityId: id,
        entityName: dist.billNumber,
        summary: `EWA distribution "${dist.billNumber}" recalculated — ${result.allocatedAmount.toFixed(2)} BHD allocated`,
      });
      if (result.warnings.length > 0) toast.info(result.warnings[0]);
      toast.success("Distribution recalculated");
      return { ...dist, ...updated } as EWADistribution;
    },
    [data.ewaDistributions, data.ewaAccounts, data.units, data.leases, data.tenants, sendUpdate, pushHistory],
  );

  /**
   * Process a draft distribution: for each chargeable (non-excluded, non-
   * landlord) unit, create a per-unit EWABill record so the existing
   * invoice automation picks it up on the next billing run. Marks the
   * distribution as Distributed and records the created EWA bill IDs back
   * onto each allocation.
   */
  const processEWADistribution = useCallback(
    (id: string): { created: number; skipped: number } => {
      const dist = data.ewaDistributions.find((d) => d.id === id);
      if (!dist) {
        toast.error("Distribution not found");
        return { created: 0, skipped: 0 };
      }
      if (dist.status === "Distributed") {
        toast.error("Distribution already processed");
        return { created: 0, skipped: dist.allocations.length };
      }
      const account = data.ewaAccounts.find((a) => a.id === dist.accountId);
      if (!account) {
        toast.error("Linked EWA account no longer exists");
        return { created: 0, skipped: dist.allocations.length };
      }

      let created = 0;
      let skipped = 0;
      const updatedAllocations = dist.allocations.map((alloc) => {
        // Skip excluded (vacant + exclude) and landlord-charged units.
        if (alloc.excluded || alloc.chargeToLandlord) {
          skipped++;
          return alloc;
        }
        // Need a lease to attach the EWA bill to (the invoice engine keys off leaseId).
        if (!alloc.leaseId) {
          skipped++;
          return alloc;
        }
        const unit = data.units.find((u) => u.id === alloc.unitId);
        const ewaBill: EWABill = {
          id: generateId("ewa"),
          billNumber: generateCode("EWA", data.ewaBills.length + created),
          leaseId: alloc.leaseId,
          unitId: alloc.unitId,
          buildingId: account.buildingId,
          month: dist.month,
          billAmount: alloc.amount,
          limit: 0, // shared-meter: no per-lease limit; full share is chargeable
          excess: alloc.amount,
          dueDate: dist.dueDate,
          status: "Pending",
          // Link back to the distribution for traceability.
          invoiceId: undefined,
        };
        sendAdd("ewaBills", ewaBill);
        created++;
        return { ...alloc, ewaBillId: ewaBill.id };
      });

      sendUpdate("ewaDistributions", id, {
        allocations: updatedAllocations,
        status: "Distributed",
      } as unknown as Record<string, unknown>);

      pushHistory({
        action: "Edited" as HistoryAction,
        entityType: "EWA Distribution",
        entityId: id,
        entityName: dist.billNumber,
        summary: `EWA distribution "${dist.billNumber}" processed — ${created} per-unit EWA bill(s) created for invoice automation`,
      });
      toast.success(`${created} EWA bill(s) created — they'll be included in the next invoice run`);
      return { created, skipped };
    },
    [data.ewaDistributions, data.ewaAccounts, data.units, data.ewaBills.length, sendAdd, sendUpdate, pushHistory],
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

  // ──────────────────────────── WhatsApp Automation ────────────────────────────

  /** Default WhatsApp settings id (singleton — one settings record per workspace). */
  const WHATSAPP_SETTINGS_ID = "whatsapp-settings-default";

  /** Get the current WhatsApp settings (creates defaults if none exist). */
  const getWhatsAppSettings = useCallback((): WhatsAppSettings => {
    const existing = data.whatsappSettings.find((s) => s.id === WHATSAPP_SETTINGS_ID);
    if (existing) return existing;
    return {
      id: WHATSAPP_SETTINGS_ID,
      autoSendEnabled: false,
      sendDayOfMonth: 1,
      channel: "both",
      connected: false,
      defaultCountryCode: "973",
    };
  }, [data.whatsappSettings]);

  /** Update WhatsApp settings (creates if they don't exist). */
  const updateWhatsAppSettings = useCallback(
    (updates: Partial<Omit<WhatsAppSettings, "id">>) => {
      const existing = data.whatsappSettings.find((s) => s.id === WHATSAPP_SETTINGS_ID);
      if (existing) {
        sendUpdate("whatsappSettings", WHATSAPP_SETTINGS_ID, updates as unknown as Record<string, unknown>);
      } else {
        const newSettings: WhatsAppSettings = {
          id: WHATSAPP_SETTINGS_ID,
          autoSendEnabled: false,
          sendDayOfMonth: 1,
          channel: "both",
          connected: false,
          defaultCountryCode: "973",
          ...updates,
        };
        sendAdd("whatsappSettings", newSettings);
      }
      pushHistory({
        action: "Edited" as HistoryAction,
        entityType: "WhatsApp Settings",
        entityId: WHATSAPP_SETTINGS_ID,
        entityName: "WhatsApp Settings",
        summary: `WhatsApp settings updated`,
      });
      toast.success("WhatsApp settings updated");
    },
    [data.whatsappSettings, sendUpdate, sendAdd, pushHistory],
  );

  /** Test the WhatsApp API connection and update settings with the result. */
  const testWhatsApp = useCallback(async (): Promise<boolean> => {
    sendUpdate("whatsappSettings", WHATSAPP_SETTINGS_ID, {
      lastTestedAt: nowISO(),
    } as unknown as Record<string, unknown>);
    const result = await testWhatsAppConnection();
    const settings = data.whatsappSettings.find((s) => s.id === WHATSAPP_SETTINGS_ID);
    if (settings) {
      sendUpdate("whatsappSettings", WHATSAPP_SETTINGS_ID, {
        lastTestOk: result.success,
        lastTestError: result.success ? undefined : result.message,
        lastTestedAt: nowISO(),
        connected: result.success,
      } as unknown as Record<string, unknown>);
    } else {
      sendAdd("whatsappSettings", {
        id: WHATSAPP_SETTINGS_ID,
        autoSendEnabled: false,
        sendDayOfMonth: 1,
        channel: "both",
        defaultCountryCode: "973",
        lastTestedAt: nowISO(),
        lastTestOk: result.success,
        lastTestError: result.success ? undefined : result.message,
        connected: result.success,
      } as unknown as WhatsAppSettings);
    }
    if (result.success) {
      toast.success(result.message);
    } else {
      toast.error(result.message);
    }
    pushHistory({
      action: "Edited" as HistoryAction,
      entityType: "WhatsApp Settings",
      entityId: WHATSAPP_SETTINGS_ID,
      entityName: "WhatsApp Settings",
      summary: result.success
        ? "WhatsApp connection test succeeded"
        : `WhatsApp connection test failed: ${result.message}`,
    });
    return result.success;
  }, [data.whatsappSettings, sendUpdate, sendAdd, pushHistory]);

  /** Send a single invoice via WhatsApp. Creates a log entry and handles status. */
  const sendInvoiceWhatsAppMessage = useCallback(
    async (invoiceId: string, options?: { isResend?: boolean }): Promise<boolean> => {
      const invoice = data.invoices.find((i) => i.id === invoiceId);
      if (!invoice) return false;

      const tenant = data.tenants.find((t) => t.id === invoice.tenantId);
      if (!tenant) {
        toast.error("Tenant not found for this invoice");
        return false;
      }
      if (!tenant.phone) {
        toast.error(`Tenant ${tenant.name} has no phone number`);
        return false;
      }

      const settings = getWhatsAppSettings();
      const billingMonth = invoice.periodFrom
        ? `${invoice.periodFrom.slice(0, 4)}-${invoice.periodFrom.slice(5, 7)}`
        : toPeriodKey(invoice.issueDate ?? invoice.dueDate);

      // ── Duplicate prevention ──
      if (!options?.isResend) {
        if (whatsappAlreadySent(data.whatsappLogs, tenant.id, billingMonth)) {
          toast.info(`WhatsApp already sent to ${tenant.name} for ${billingMonth}`);
          return false;
        }
      }

      const ctx = buildPdfContext(invoice);
      const phoneNumber = normalizePhoneNumber(tenant.phone, settings.defaultCountryCode);

      // Create a log entry (queued status)
      const logId = generateId("walog");
      const log: WhatsAppLog = {
        id: logId,
        tenantId: tenant.id,
        invoiceId: invoice.id,
        billingMonth,
        phoneNumber,
        sentAt: nowISO(),
        status: "queued",
        retryCount: 0,
        isResend: options?.isResend ?? false,
        hasAttachment: true,
      };
      sendAdd("whatsappLogs", log);

      // Attempt to send
      const result = await sendInvoiceWhatsApp(ctx, { isResend: options?.isResend });

      if (result.success) {
        sendUpdate("whatsappLogs", logId, {
          status: "sent",
          whatsappMessageId: result.messageId,
          sentAt: nowISO(),
          failed: false,
          errorMessage: undefined,
        } as unknown as Record<string, unknown>);
        pushHistory({
          action: "Edited" as HistoryAction,
          entityType: "Invoice",
          entityId: invoice.id,
          entityName: invoice.invoiceNumber,
          summary: `Invoice ${invoice.invoiceNumber} sent via WhatsApp to ${tenant.name}`,
        });
        toast.success(`WhatsApp sent to ${tenant.name}`);
        return true;
      } else {
        sendUpdate("whatsappLogs", logId, {
          status: "failed",
          failed: true,
          errorMessage: result.message,
          retryCount: 3, // the client already retried 3 times
          sentAt: nowISO(),
        } as unknown as Record<string, unknown>);
        pushHistory({
          action: "Edited" as HistoryAction,
          entityType: "WhatsApp Log",
          entityId: logId,
          entityName: invoice.invoiceNumber,
          summary: `WhatsApp send failed for ${invoice.invoiceNumber}: ${result.message}`,
        });
        toast.error(`WhatsApp failed: ${result.message}`);
        return false;
      }
    },
    [data.invoices, data.tenants, data.whatsappLogs, getWhatsAppSettings, buildPdfContext, sendAdd, sendUpdate, pushHistory],
  );

  /** Resend a failed WhatsApp message (manual retry from the dashboard). */
  const resendWhatsAppMessage = useCallback(
    async (logId: string): Promise<boolean> => {
      const log = data.whatsappLogs.find((l) => l.id === logId);
      if (!log) return false;
      if (log.retryCount >= 3) {
        toast.error("Max retries reached. The client will attempt 3 more sends.");
      }
      // Reset retry count and attempt a fresh send
      sendUpdate("whatsappLogs", logId, {
        status: "queued",
        failed: false,
        errorMessage: undefined,
        retryCount: log.retryCount,
        sentAt: nowISO(),
      } as unknown as Record<string, unknown>);
      // Actually resend (the send function does its own 3 retries)
      return sendInvoiceWhatsAppMessage(log.invoiceId, { isResend: true });
    },
    [data.whatsappLogs, sendUpdate, sendInvoiceWhatsAppMessage],
  );

  /** Batch-send all Draft/Sent invoices via WhatsApp (for the current month). */
  const sendAllInvoicesWhatsApp = useCallback(
    async (filter?: (inv: Invoice) => boolean): Promise<{ sent: number; failed: number }> => {
      const settings = getWhatsAppSettings();
      const toSend = data.invoices.filter(
        (i) =>
          (i.status === "Draft" || i.status === "Sent" || i.status === "Overdue") &&
          (!filter || filter(i)),
      );

      let sent = 0;
      let failed = 0;

      for (const invoice of toSend) {
        const tenant = data.tenants.find((t) => t.id === invoice.tenantId);
        if (!tenant?.phone) {
          failed++;
          continue;
        }
        const billingMonth = invoice.periodFrom
          ? `${invoice.periodFrom.slice(0, 4)}-${invoice.periodFrom.slice(5, 7)}`
          : toPeriodKey(invoice.issueDate ?? invoice.dueDate);
        if (whatsappAlreadySent(data.whatsappLogs, tenant.id, billingMonth)) {
          continue;
        }
        const ok = await sendInvoiceWhatsAppMessage(invoice.id);
        if (ok) sent++;
        else failed++;
      }

      if (sent > 0) toast.success(`${sent} WhatsApp invoice(s) sent`);
      if (failed > 0) toast.error(`${failed} WhatsApp invoice(s) failed`);
      return { sent, failed };
    },
    [data.invoices, data.tenants, data.whatsappLogs, getWhatsAppSettings, sendInvoiceWhatsAppMessage],
  );

  /** Automatic monthly WhatsApp run — sends invoices for all active tenants. */
  const runAutomaticWhatsAppSend = useCallback(async (): Promise<{ sent: number; failed: number }> => {
    const settings = getWhatsAppSettings();
    if (!settings.autoSendEnabled) {
      return { sent: 0, failed: 0 };
    }
    const result = await sendAllInvoicesWhatsApp();
    sendUpdate("whatsappSettings", WHATSAPP_SETTINGS_ID, {
      lastAutoRunAt: nowISO(),
    } as unknown as Record<string, unknown>);
    pushHistory({
      action: "Edited" as HistoryAction,
      entityType: "WhatsApp Settings",
      entityId: WHATSAPP_SETTINGS_ID,
      entityName: "WhatsApp Settings",
      summary: `Automatic WhatsApp send run completed — ${result.sent} sent, ${result.failed} failed`,
    });
    return result;
  }, [getWhatsAppSettings, sendAllInvoicesWhatsApp, sendUpdate, pushHistory]);

  /** Scheduler — checks on app load if today is the send day and runs the automatic send. */
  useEffect(() => {
    const settings = data.whatsappSettings.find((s) => s.id === WHATSAPP_SETTINGS_ID);
    if (!settings?.autoSendEnabled) return;
    const today = new Date();
    const todayDay = today.getDate();
    const lastRun = settings.lastAutoRunAt ? new Date(settings.lastAutoRunAt) : null;
    const sameDay = lastRun && lastRun.getDate() === todayDay && lastRun.getMonth() === today.getMonth() && lastRun.getFullYear() === today.getFullYear();
    if (todayDay === settings.sendDayOfMonth && !sameDay) {
      void runAutomaticWhatsAppSend().catch((err) => {
        console.error("[whatsapp] automatic send failed", err);
        toast.error("Automatic WhatsApp send failed — check logs");
      });
    }
  }, [data.whatsappSettings, runAutomaticWhatsAppSend]);

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
  const getLeaseAgreementById = useCallback((id: string) => data.leaseAgreements.find((a) => a.id === id), [data.leaseAgreements]);
  const getLeaseAgreementByLeaseId = useCallback(
    (leaseId: string) => data.leaseAgreements.find((a) => a.leaseId === leaseId),
    [data.leaseAgreements],
  );
  const getEWAAccountById = useCallback((id: string) => data.ewaAccounts.find((a) => a.id === id), [data.ewaAccounts]);
  const getBuildingEWAAccounts = useCallback(
    (buildingId: string) => data.ewaAccounts.filter((a) => a.buildingId === buildingId),
    [data.ewaAccounts],
  );
  const getEWADistributionsForAccount = useCallback(
    (accountId: string) => data.ewaDistributions.filter((d) => d.accountId === accountId),
    [data.ewaDistributions],
  );
  const getUnitEWAAccount = useCallback(
    (unitId: string) => data.ewaAccounts.find((a) => a.status === "Active" && a.linkedUnitIds.includes(unitId)),
    [data.ewaAccounts],
  );

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
    addEWAAccount,
    updateEWAAccount,
    deleteEWAAccount,
    createEWADistribution,
    updateEWADistribution,
    deleteEWADistribution,
    recalculateEWADistribution,
    processEWADistribution,
    getEWAAccountById,
    getBuildingEWAAccounts,
    getEWADistributionsForAccount,
    getUnitEWAAccount,
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
    getLeaseAgreementById,
    getLeaseAgreementByLeaseId,
    regenerateLeaseAgreement,
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
    // WhatsApp automation
    getWhatsAppSettings,
    updateWhatsAppSettings,
    testWhatsApp,
    sendInvoiceWhatsAppMessage,
    resendWhatsAppMessage,
    sendAllInvoicesWhatsApp,
    runAutomaticWhatsAppSend,
    // Low-level mutation helpers used by admin tools like template calibration.
    sendUpdate,
    sendAdd,
    sendDelete,
  };
});
