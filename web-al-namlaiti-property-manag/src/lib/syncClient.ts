// src/lib/syncClient.ts
// Client-side sync layer that maintains a single WebSocket connection to the
// shared workspace backend and exposes a subscribe/send API to the DataContext.
//
// Responsibilities:
// - Open a WebSocket to the backend on first use, reconnect on drop.
// - Maintain a single source of truth callback that receives server messages.
// - Provide send() to push mutations to the workspace.
// - Expose connection status (connected / reconnecting) for the UI indicator.

import type { DataStore } from "@/context/DataContext";

export type CollectionKey = keyof DataStore;

export type MutateOp =
  | { kind: "add"; collection: CollectionKey; entity: Record<string, unknown> }
  | { kind: "update"; collection: CollectionKey; id: string; patch: Record<string, unknown> }
  | { kind: "delete"; collection: CollectionKey; id: string; snapshot?: Record<string, unknown> };

export type ServerMessage =
  | { type: "snapshot"; store: DataStore }
  | { type: "patch"; op: MutateOp; actor: string }
  | { type: "recover"; historyId: string; restored: { collection: CollectionKey; entity: Record<string, unknown> } }
  | { type: "clearHistory" }
  | { type: "error"; message: string };

export type ConnectionStatus = "connecting" | "connected" | "reconnecting" | "offline";

export type ServerMessageHandler = (msg: ServerMessage) => void;
export type StatusHandler = (status: ConnectionStatus) => void;

const BACKEND_URL =
  (import.meta.env.VITE_RORK_FUNCTIONS_URL as string | undefined) ??
  (import.meta.env.EXPO_PUBLIC_RORK_FUNCTIONS_URL as string | undefined) ??
  "";

function toWsUrl(httpUrl: string): string {
  if (!httpUrl) return "";
  return httpUrl.replace(/^http/i, "ws");
}

/** Generate a short random guest label, persisted in localStorage. */
export function getActorLabel(): string {
  if (typeof window === "undefined") return "Guest-local";
  const KEY = "al-namlaiti-actor";
  const existing = localStorage.getItem(KEY);
  if (existing) return existing;
  const suffix = Math.random().toString(36).slice(2, 6);
  const label = `Guest-${suffix}`;
  localStorage.setItem(KEY, label);
  return label;
}

/**
 * Singleton sync client. One WebSocket per browser tab. The DataContext
 * registers its message handler here; the sync client owns the socket.
 */
class SyncClient {
  private ws: WebSocket | null = null;
  private wsUrl: string;
  private messageHandler: ServerMessageHandler | null = null;
  private statusHandler: StatusHandler | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectDelay = 1000;
  private maxReconnectDelay = 15000;
  private hasSubscribed = false;
  private disposed = false;

  constructor() {
    this.wsUrl = toWsUrl(BACKEND_URL);
  }

  setMessageHandler(handler: ServerMessageHandler): void {
    this.messageHandler = handler;
  }

  setStatusHandler(handler: StatusHandler): void {
    this.statusHandler = handler;
  }

  connect(): void {
    if (this.disposed) return;
    if (!this.wsUrl) {
      // No backend configured — run in offline/local-only mode.
      this.statusHandler?.("offline");
      return;
    }
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.statusHandler?.(this.hasSubscribed ? "reconnecting" : "connecting");

    let ws: WebSocket;
    try {
      ws = new WebSocket(this.wsUrl);
    } catch {
      this.scheduleReconnect();
      return;
    }
    this.ws = ws;

    ws.onopen = () => {
      this.reconnectDelay = 1000;
      this.hasSubscribed = true;
      this.statusHandler?.("connected");
      // Send subscribe immediately to get the full snapshot.
      this.sendRaw({ type: "subscribe" });
    };

    ws.onmessage = (event: MessageEvent) => {
      let msg: ServerMessage;
      try {
        msg = JSON.parse(typeof event.data === "string" ? event.data : new TextDecoder().decode(event.data as ArrayBuffer)) as ServerMessage;
      } catch {
        return;
      }
      this.messageHandler?.(msg);
    };

    ws.onclose = () => {
      this.ws = null;
      if (this.disposed) return;
      this.statusHandler?.("reconnecting");
      this.scheduleReconnect();
    };

    ws.onerror = () => {
      // onclose will follow and trigger reconnect.
      try { ws.close(); } catch { /* ignore */ }
    };
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.reconnectDelay = Math.min(this.reconnectDelay * 1.5, this.maxReconnectDelay);
      this.connect();
    }, this.reconnectDelay);
  }

  private sendRaw(payload: unknown): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try { this.ws.send(JSON.stringify(payload)); } catch { /* ignore */ }
    }
  }

  /**
   * Send a mutation to the workspace. The server will broadcast the change
   * (including back to us) which the DataContext applies to update state.
   */
  sendMutate(op: MutateOp, actor: string): void {
    this.sendRaw({ type: "mutate", op, actor });
  }

  sendRecover(historyId: string, actor: string): void {
    this.sendRaw({ type: "recover", historyId, actor });
  }

  sendClearHistory(actor: string): void {
    this.sendRaw({ type: "clearHistory", actor });
  }

  dispose(): void {
    this.disposed = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      try { this.ws.close(); } catch { /* ignore */ }
      this.ws = null;
    }
  }
}

// One shared instance per tab.
export const syncClient = new SyncClient();
