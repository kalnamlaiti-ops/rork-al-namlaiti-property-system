// functions/workspace.ts
// Shared workspace Durable Object for Al Namlaiti Property Management.
// Holds the canonical data store (all entities + history) in SQLite and
// broadcasts every mutation to all connected clients over WebSocket.
//
// Uses the classic event-listener WebSocket pattern (not hibernation) for
// maximum reliability across hosting environments.

import { DurableObject } from "cloudflare:workers";

export interface DataStore {
  owners: unknown[];
  buildings: unknown[];
  units: unknown[];
  tenants: unknown[];
  leases: unknown[];
  invoices: unknown[];
  payments: unknown[];
  expenses: unknown[];
  chartOfAccounts: unknown[];
  journalEntries: unknown[];
  distributions: unknown[];
  ewaBills: unknown[];
  ewaAccounts: unknown[];
  ewaDistributions: unknown[];
  complaints: unknown[];
  maintenanceRequests: unknown[];
  vendors: unknown[];
  assets: unknown[];
  documents: unknown[];
  whatsappLogs: unknown[];
  whatsappSettings: unknown[];
  history: unknown[];
}

const COLLECTION_KEYS: (keyof DataStore)[] = [
  "owners",
  "buildings",
  "units",
  "tenants",
  "leases",
  "invoices",
  "payments",
  "expenses",
  "chartOfAccounts",
  "journalEntries",
  "distributions",
  "ewaBills",
  "ewaAccounts",
  "ewaDistributions",
  "complaints",
  "maintenanceRequests",
  "vendors",
  "assets",
  "documents",
  "whatsappLogs",
  "whatsappSettings",
  "history",
];

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
  whatsappLogs: [],
  whatsappSettings: [],
  history: [],
};

// Message shapes exchanged with the client.
type ClientMessage =
  | { type: "subscribe" }
  | { type: "mutate"; op: MutateOp; actor: string }
  | { type: "recover"; historyId: string; actor: string }
  | { type: "clearHistory"; actor: string };

type MutateOp =
  | { kind: "add"; collection: keyof DataStore; entity: Record<string, unknown> }
  | { kind: "update"; collection: keyof DataStore; id: string; patch: Record<string, unknown> }
  | { kind: "delete"; collection: keyof DataStore; id: string; snapshot?: Record<string, unknown> }
  | { kind: "replaceCollection"; collection: keyof DataStore; rows: unknown[] };

type ServerMessage =
  | { type: "snapshot"; store: DataStore }
  | { type: "patch"; op: MutateOp; actor: string }
  | { type: "recover"; historyId: string; restored: { collection: keyof DataStore; entity: Record<string, unknown> } }
  | { type: "clearHistory" }
  | { type: "error"; message: string };

type Env = { DO: Fetcher };

export class Workspace extends DurableObject<Env> {
  // In-memory cache of the full store; hydrated lazily on first access.
  private store: DataStore | null = null;
  private hydrated = false;
  // Track connected sockets so we can broadcast.
  private sockets: Set<WebSocket> = new Set();

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.ctx.storage.sql.exec(`
      CREATE TABLE IF NOT EXISTS kv (
        key   TEXT PRIMARY KEY,
        value TEXT NOT NULL
      )
    `);
  }

  // ─────────────────────────── HTTP entry ───────────────────────────

  override async fetch(request: Request): Promise<Response> {
    // ── HTTP endpoint for WhatsApp webhook status updates ──
    // The Worker parses Meta's webhook payload and forwards status updates here.
    if (request.headers.get("Upgrade") !== "websocket") {
      if (request.method === "POST") {
        return this.handleWebhookStatus(request);
      }
      return new Response("expected websocket", { status: 426 });
    }
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);

    // Attach event listeners BEFORE returning so messages are never missed.
    server.accept();
    this.sockets.add(server);

    server.addEventListener("message", (event: MessageEvent) => {
      this.handleMessage(server, event.data);
    });
    server.addEventListener("close", () => {
      this.sockets.delete(server);
    });
    server.addEventListener("error", () => {
      this.sockets.delete(server);
    });

    return new Response(null, { status: 101, webSocket: client });
  }

  // ─────────────────────────── Message handling ───────────────────────────

  private async handleMessage(ws: WebSocket, raw: string | ArrayBuffer): Promise<void> {
    let msg: ClientMessage;
    try {
      msg = JSON.parse(typeof raw === "string" ? raw : new TextDecoder().decode(raw)) as ClientMessage;
    } catch {
      console.warn("[ws] invalid json");
      this.sendTo(ws, { type: "error", message: "invalid json" });
      return;
    }

    try {
      await this.ensureHydrated();
    } catch (err) {
      console.error("[ws] hydrate failed", err);
      this.sendTo(ws, { type: "error", message: "hydrate failed" });
      return;
    }

    try {
      switch (msg.type) {
        case "subscribe":
          this.sendTo(ws, { type: "snapshot", store: this.store as DataStore });
          return;

        case "mutate": {
          const result = this.applyMutate(msg.op);
          if (!result.ok) {
            console.warn("[ws] mutate failed", result.error);
            this.sendTo(ws, { type: "error", message: result.error });
            return;
          }
          this.persist();
          this.broadcast({ type: "patch", op: msg.op, actor: msg.actor });
          return;
        }

        case "recover": {
          const recovered = this.applyRecover(msg.historyId);
          if (!recovered.ok) {
            console.warn("[ws] recover failed", recovered.error);
            this.sendTo(ws, { type: "error", message: recovered.error });
            return;
          }
          this.persist();
          this.broadcast({ type: "recover", historyId: msg.historyId, restored: recovered.value });
          return;
        }

        case "clearHistory": {
          this.store = { ...(this.store as DataStore), history: [] };
          this.persist();
          this.broadcast({ type: "clearHistory" });
          return;
        }

        default:
          this.sendTo(ws, { type: "error", message: "unknown message type" });
      }
    } catch (err) {
      console.error("[ws] handler threw", err);
      this.sendTo(ws, { type: "error", message: "internal error" });
    }
  }

  // ─────────────────────────── Mutation logic ───────────────────────────

  private applyMutate(op: MutateOp): { ok: true } | { ok: false; error: string } {
    const store = this.store as DataStore;
    if (!COLLECTION_KEYS.includes(op.collection)) {
      return { ok: false, error: `unknown collection: ${String(op.collection)}` };
    }

    switch (op.kind) {
      case "add": {
        const arr = store[op.collection] as unknown[];
        if (!Array.isArray(arr)) return { ok: false, error: "not an array collection" };
        const idx = arr.findIndex((r) => (r as { id?: string }).id === (op.entity as { id?: string }).id);
        if (idx >= 0) arr[idx] = op.entity;
        else arr.push(op.entity);
        return { ok: true };
      }

      case "update": {
        const arr = store[op.collection] as { id: string }[];
        const idx = arr.findIndex((r) => r.id === op.id);
        if (idx < 0) return { ok: false, error: "entity not found" };
        arr[idx] = { ...arr[idx], ...op.patch, id: op.id };
        return { ok: true };
      }

      case "delete": {
        const arr = store[op.collection] as { id: string }[];
        const idx = arr.findIndex((r) => r.id === op.id);
        if (idx < 0) return { ok: false, error: "entity not found" };
        arr.splice(idx, 1);
        return { ok: true };
      }

      case "replaceCollection": {
        if (!COLLECTION_KEYS.includes(op.collection)) {
          return { ok: false, error: `unknown collection: ${String(op.collection)}` };
        }
        (store as Record<string, unknown[]>)[op.collection as string] = op.rows;
        return { ok: true };
      }
    }
  }

  private applyRecover(historyId: string): { ok: true; value: { collection: keyof DataStore; entity: Record<string, unknown> } } | { ok: false; error: string } {
    const store = this.store as DataStore;
    const history = store.history as Array<{
      id: string;
      action: string;
      entityType: string;
      entityId: string;
      entityName: string;
      snapshot?: unknown;
      recovered?: boolean;
    }>;
    const entry = history.find((h) => h.id === historyId);
    if (!entry || entry.action !== "Deleted" || entry.recovered || !entry.snapshot) {
      return { ok: false, error: "no recoverable snapshot" };
    }
    const map: Record<string, keyof DataStore> = {
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
      "WhatsApp Log": "whatsappLogs",
      "WhatsApp Settings": "whatsappSettings",
    };
    const collection = map[entry.entityType];
    if (!collection) return { ok: false, error: `unknown entity type: ${entry.entityType}` };
    const snapshot = entry.snapshot as Record<string, unknown>;
    const arr = store[collection] as { id: string }[];
    if (!arr.some((r) => r.id === (snapshot.id as string))) {
      arr.push(snapshot as { id: string });
    }
    entry.recovered = true;
    return { ok: true, value: { collection, entity: snapshot } };
  }

  // ─────────────────────────── Persistence ───────────────────────────

  private async ensureHydrated(): Promise<void> {
    if (this.hydrated) return;
    this.hydrated = true;
    const row = this.ctx.storage.sql.exec<{ value: string }>("SELECT value FROM kv WHERE key = ?", "store").toArray()[0];
    if (row) {
      try {
        const parsed = JSON.parse(row.value) as Partial<DataStore>;
        this.store = { ...EMPTY_STORE, ...parsed };
        for (const k of COLLECTION_KEYS) {
          if (!Array.isArray((this.store as DataStore)[k])) (this.store as DataStore)[k] = [];
        }
        return;
      } catch {
        // fall through to empty store
      }
    }
    this.store = { ...EMPTY_STORE };
  }

  private persistThrottle: ReturnType<typeof setTimeout> | null = null;

  private persist(): void {
    if (this.persistThrottle) return;
    this.persistThrottle = setTimeout(() => {
      this.persistThrottle = null;
      const snapshot = JSON.stringify(this.store);
      this.ctx.waitUntil(
        this.ctx.storage.sql.exec(
          `INSERT INTO kv (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
          "store",
          snapshot,
        ).catch((err: unknown) => console.error("persist failed", err)),
      );
    }, 150);
  }

  // ─────────────────────────── WhatsApp webhook status ───────────────────────────

  /**
   * Handle a WhatsApp webhook status update from the Worker.
   * The Worker parses Meta's payload and sends a simplified JSON body:
   *   { messageId: string, status: string, timestamp?: string }
   * We find the matching WhatsAppLog, update its status, and broadcast.
   */
  private async handleWebhookStatus(request: Request): Promise<Response> {
    try {
      const body = (await request.json()) as {
        messageId?: string;
        status?: string;
        timestamp?: string;
        errorCode?: number;
        errorMessage?: string;
      };

      if (!body.messageId || !body.status) {
        return new Response("missing messageId or status", { status: 400 });
      }

      await this.ensureHydrated();
      const store = this.store as DataStore;
      const logs = store.whatsappLogs as Array<Record<string, unknown>>;

      // Find the log entry by messageId (Meta's wamid)
      const idx = logs.findIndex(
        (log) => log.messageId === body.messageId,
      );

      if (idx < 0) {
        // No matching log — acknowledge so Meta doesn't retry
        return new Response("OK", { status: 200 });
      }

      // Map Meta status to our WhatsAppLog status
      const statusMap: Record<string, string> = {
        sent: "Sent",
        delivered: "Delivered",
        read: "Read",
        failed: "Failed",
      };
      const mappedStatus = statusMap[body.status] ?? body.status;

      const patch: Record<string, unknown> = {
        status: mappedStatus,
        deliveredAt: body.timestamp ?? new Date().toISOString(),
      };
      if (body.status === "failed") {
        patch.error = body.errorMessage ?? "Delivery failed";
        patch.errorCode = body.errorCode;
      }

      logs[idx] = { ...logs[idx], ...patch };

      const op: MutateOp = {
        kind: "update",
        collection: "whatsappLogs",
        id: logs[idx].id as string,
        patch,
      };

      this.persist();
      this.broadcast({ type: "patch", op, actor: "whatsapp-webhook" });

      return new Response("OK", { status: 200 });
    } catch (err) {
      console.error("[do] webhook status failed", err);
      return new Response("OK", { status: 200 });
    }
  }

  // ─────────────────────────── Broadcast helpers ───────────────────────────

  private sendTo(ws: WebSocket, msg: ServerMessage): void {
    try { ws.send(JSON.stringify(msg)); } catch { /* socket may be closed */ }
  }

  private broadcast(msg: ServerMessage): void {
    const payload = JSON.stringify(msg);
    for (const peer of this.sockets) {
      try { peer.send(payload); } catch { /* ignore */ }
    }
  }
}
