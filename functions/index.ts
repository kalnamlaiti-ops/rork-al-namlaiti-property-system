// functions/index.ts — Worker entrypoint.
// Routes WebSocket upgrades and HTTP requests to the shared Workspace DO.
// Sends invoice emails via the Gmail API (OAuth2) from namlity@gmail.com).
// Sends invoice WhatsApp messages via the Meta WhatsApp Cloud API.

export { Workspace } from "./workspace";

type Env = {
  DO: Fetcher;
  // Gmail OAuth2 credentials — set as project env vars (secrets).
  GMAIL_CLIENT_ID?: string;
  GMAIL_CLIENT_SECRET?: string;
  GMAIL_REFRESH_TOKEN?: string;
  GMAIL_SENDER?: string; // e.g. "namlity@gmail.com"
  // WhatsApp Cloud API credentials — set as project env vars (secrets).
  WHATSAPP_ACCESS_TOKEN?: string;
  WHATSAPP_PHONE_NUMBER_ID?: string;
  WHATSAPP_VERIFY_TOKEN?: string;
  WHATSAPP_BUSINESS_ACCOUNT_ID?: string;
};

const WHATSAPP_API_BASE = "https://graph.facebook.com/v21.0";

// A single shared workspace for the whole project. Anyone with the app URL
// joins the same workspace, sees the same data, and gets live updates.
const WORKSPACE_ID = "al-namlaiti-shared";

const DEFAULT_SENDER = "namlity@gmail.com";
const FROM_NAME = "Al Namlaiti Property Management";

interface SendInvoiceRequest {
  to: string;
  subject: string;
  body: string;
  attachmentName?: string;
  attachmentBase64?: string;
}

/** Base64url encode a string (Gmail API requirement). */
function base64url(input: string): string {
  // Encode UTF-8 → bytes → base64 → base64url
  const bytes = new TextEncoder().encode(input);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  const b64 = btoa(binary);
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Base64url-encode raw bytes from a standard base64 string. */
function base64urlFromB64(b64: string): string {
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * Refresh the Gmail OAuth2 access token using the stored refresh token.
 * Returns a short-lived access token (~1 hour).
 */
async function refreshGmailToken(env: Env): Promise<string> {
  const clientId = env.GMAIL_CLIENT_ID;
  const clientSecret = env.GMAIL_CLIENT_SECRET;
  const refreshToken = env.GMAIL_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(
      "Gmail OAuth not configured — set GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN",
    );
  }

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "token error");
    throw new Error(`Gmail token refresh failed: ${res.status} ${text}`);
  }

  const data = (await res.json()) as { access_token?: string };
  if (!data.access_token) {
    throw new Error("Gmail token refresh returned no access_token");
  }
  return data.access_token;
}

/**
 * Build a RFC 2822 MIME message with optional PDF attachment.
 * Uses standard multipart/mixed so Gmail renders the body and attachment.
 */
function buildMimeMessage(
  fromEmail: string,
  fromName: string,
  to: string,
  subject: string,
  body: string,
  attachmentName?: string,
  attachmentBase64?: string,
): string {
  const boundary = "boundary_" + Math.random().toString(36).slice(2);
  const date = new Date().toUTCString();

  const headers =
    `From: ${fromName} <${fromEmail}>\r\n` +
    `To: ${to}\r\n` +
    `Subject: ${subject}\r\n` +
    `Date: ${date}\r\n` +
    `MIME-Version: 1.0\r\n`;

  if (!attachmentName || !attachmentBase64) {
    // Plain text only
    return (
      headers +
      `Content-Type: text/plain; charset=UTF-8\r\n` +
      `Content-Transfer-Encoding: 7bit\r\n\r\n` +
      body
    );
  }

  // Multipart with attachment
  const attachmentB64Url = base64urlFromB64(attachmentBase64);
  return (
    headers +
    `Content-Type: multipart/mixed; boundary="${boundary}"\r\n\r\n` +
    `--${boundary}\r\n` +
    `Content-Type: text/plain; charset=UTF-8\r\n` +
    `Content-Transfer-Encoding: 7bit\r\n\r\n` +
    body +
    `\r\n\r\n` +
    `--${boundary}\r\n` +
    `Content-Type: application/pdf; name="${attachmentName}"\r\n` +
    `Content-Transfer-Encoding: base64\r\n` +
    `Content-Disposition: attachment; filename="${attachmentName}"\r\n` +
    `Content-ID: <${attachmentName}>\r\n\r\n` +
    chunkBase64(attachmentB64Url) +
    `\r\n\r\n` +
    `--${boundary}--`
  );
}

/** Split a base64 string into 76-char lines (RFC 2045 soft line length). */
function chunkBase64(s: string, size = 76): string {
  let out = "";
  for (let i = 0; i < s.length; i += size) {
    out += s.slice(i, i + size) + "\r\n";
  }
  return out.trimEnd();
}

async function sendInvoiceEmail(
  req: SendInvoiceRequest,
  env: Env,
): Promise<Response> {
  const { to, subject, body, attachmentName, attachmentBase64 } = req;
  if (!to || !subject || !body) {
    return Response.json(
      { ok: false, error: "Missing to/subject/body" },
      { status: 400 },
    );
  }

  const senderEmail = env.GMAIL_SENDER || DEFAULT_SENDER;

  try {
    const accessToken = await refreshGmailToken(env);
    const mime = buildMimeMessage(
      senderEmail,
      FROM_NAME,
      to,
      subject,
      body,
      attachmentName,
      attachmentBase64,
    );
    const raw = base64url(mime);

    const res = await fetch(
      "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ raw }),
      },
    );

    if (!res.ok) {
      const text = await res.text().catch(() => "Gmail API error");
      console.error("[email] Gmail send failed", res.status, text);
      return Response.json(
        { ok: false, error: `Gmail API: ${res.status} ${text}` },
        { status: 502 },
      );
    }

    const result = (await res.json()) as { id?: string };
    return Response.json({ ok: true, sentTo: to, messageId: result.id });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[email] send failed", msg);
    return Response.json({ ok: false, error: msg }, { status: 500 });
  }
}

// ──────────────────────────── WhatsApp Cloud API ────────────────────────────

interface WhatsAppSendRequest {
  /** Recipient phone number in international format without + (e.g. "9733xxxxxxx"). */
  to: string;
  /** Message body text (required for text messages, ignored for document-only). */
  body?: string;
  /** PDF attachment as base64 (optional). When provided, a document message is sent. */
  attachmentName?: string;
  attachmentBase64?: string;
  /** WhatsApp Cloud API phone_number_id to send from (falls back to env). */
  phoneNumberId?: string;
}

/** Verify the WhatsApp webhook — Meta sends hub.challenge during setup. */
function whatsappWebhookVerify(url: URL, env: Env): Response {
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  if (mode === "subscribe" && token && env.WHATSAPP_VERIFY_TOKEN && token === env.WHATSAPP_VERIFY_TOKEN) {
    return new Response(challenge ?? "", { status: 200 });
  }
  console.log("[whatsapp] webhook verify failed", { mode, hasToken: !!token, hasEnvToken: !!env.WHATSAPP_VERIFY_TOKEN });
  return new Response("Forbidden", { status: 403 });
}

/**
 * Receive WhatsApp webhook events (status updates + incoming messages).
 * Meta sends status updates (sent/delivered/read/failed) and incoming messages here.
 * We parse the payload, extract status updates, and forward them to the Workspace DO
 * so WhatsAppLog entries are updated in real-time across all connected clients.
 */
async function whatsappWebhookReceive(request: Request, env: Env): Promise<Response> {
  try {
    const payload = (await request.json()) as {
      entry?: Array<{
        id?: string;
        changes?: Array<{
          field?: string;
          value?: {
            messaging_product?: string;
            statuses?: Array<{
              id: string;
              status: string;
              recipient_id?: string;
              timestamp?: string;
              errors?: Array<{ code?: number; title?: string; message?: string }>;
            }>;
            messages?: Array<{
              id: string;
              from: string;
              text?: { body: string };
              timestamp?: string;
            }>;
          };
        }>;
      }>;
    };

    console.log("[whatsapp] webhook received", JSON.stringify(payload).slice(0, 500));

    // Extract status updates and forward each to the DO
    const entries = payload.entry ?? [];
    for (const entry of entries) {
      const changes = entry.changes ?? [];
      for (const change of changes) {
        const statuses = change.value?.statuses ?? [];
        for (const status of statuses) {
          const errors = status.errors?.[0];
          await forwardWebhookStatus(env, {
            messageId: status.id,
            status: status.status,
            timestamp: status.timestamp
              ? new Date(Number(status.timestamp) * 1000).toISOString()
              : new Date().toISOString(),
            errorCode: errors?.code,
            errorMessage: errors?.message ?? errors?.title,
          });
        }
        // Incoming messages from tenants — logged for future use
        const messages = change.value?.messages ?? [];
        if (messages.length > 0) {
          for (const msg of messages) {
            console.log("[whatsapp] incoming message from", msg.from, "text:", msg.text?.body?.slice(0, 100));
          }
        }
      }
    }

    // Always return 200 so Meta doesn't retry
    return new Response("OK", { status: 200 });
  } catch {
    return new Response("OK", { status: 200 });
  }
}

/** Forward a parsed status update to the Workspace DO via HTTP POST. */
async function forwardWebhookStatus(
  env: Env,
  status: { messageId: string; status: string; timestamp?: string; errorCode?: number; errorMessage?: string },
): Promise<void> {
  try {
    const doUrl = `https://al-namlaiti-property-system-backend.rork.app/do/Workspace/${WORKSPACE_ID}`;
    const res = await fetch(doUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(status),
    });
    if (!res.ok) {
      console.error("[whatsapp] DO status forward failed", res.status);
    }
  } catch (err) {
    console.error("[whatsapp] DO status forward error", err);
  }
}

/**
 * Resolve the actual phone_number_id to use for sending.
 *
 * The env var WHATSAPP_PHONE_NUMBER_ID might contain:
 *  (a) a phone number ID  → direct GET works
 *  (b) a WABA ID          → query /phone_numbers edge
 *  (c) some other ID      → use debug_token to discover WABA IDs from granular_scopes
 *
 * Tries (a) → (b) → (c), caches the first successful result.
 */
// Cache the resolved phone number ID with a timestamp so credential changes invalidate it.
let cachedPhoneNumberId = "";
let cachedAt = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface WhatsAppPhoneNumber {
  id: string;
  displayPhone?: string;
  verifiedName?: string;
  codeVerificationStatus?: string;
  platformType?: string;
  qualityRating?: string;
}

async function fetchPhoneNumbersFromWaba(
  token: string,
  wabaId: string,
): Promise<WhatsAppPhoneNumber[]> {
  try {
    const res = await fetch(`${WHATSAPP_API_BASE}/${wabaId}/phone_numbers`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return [];
    const data = (await res.json()) as {
      data?: Array<{
        id: string;
        display_phone_number?: string;
        verified_name?: string;
        code_verification_status?: string;
        platform_type?: string;
        quality_rating?: string;
      }>;
    };
    return (data.data ?? []).map((p) => ({
      id: p.id,
      displayPhone: p.display_phone_number,
      verifiedName: p.verified_name,
      codeVerificationStatus: p.code_verification_status,
      platformType: p.platform_type,
      qualityRating: p.quality_rating,
    }));
  } catch {
    return [];
  }
}

async function resolvePhoneNumberId(env: Env): Promise<{ id: string; displayPhone?: string; verifiedName?: string; error?: string }> {
  if (cachedPhoneNumberId && (Date.now() - cachedAt) < CACHE_TTL_MS) {
    return { id: cachedPhoneNumberId };
  }
  cachedPhoneNumberId = "";
  cachedAt = 0;

  const token = env.WHATSAPP_ACCESS_TOKEN;
  const providedId = env.WHATSAPP_PHONE_NUMBER_ID;

  if (!token || !providedId) {
    return { id: "", error: "WHATSAPP_ACCESS_TOKEN or WHATSAPP_PHONE_NUMBER_ID not configured" };
  }

  const allNumbers: WhatsAppPhoneNumber[] = [];
  const triedWabaIds = new Set<string>();

  // Strategy 1: try direct GET on the provided ID (works if it's a phone number ID)
  try {
    const res = await fetch(`${WHATSAPP_API_BASE}/${providedId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const data = (await res.json()) as { display_phone_number?: string; verified_name?: string; id?: string; code_verification_status?: string };
      const phone: WhatsAppPhoneNumber = {
        id: data.id ?? providedId,
        displayPhone: data.display_phone_number,
        verifiedName: data.verified_name,
        codeVerificationStatus: data.code_verification_status,
      };
      cachedPhoneNumberId = phone.id;
      cachedAt = Date.now();
      return phone;
    }
  } catch {
    // fall through
  }

  // Strategy 2: the provided ID might be a WABA ID — query its phone_numbers edge
  const fromWaba = await fetchPhoneNumbersFromWaba(token, providedId);
  if (fromWaba.length > 0) {
    allNumbers.push(...fromWaba);
    triedWabaIds.add(providedId);
  }

  // Strategy 3: use debug_token to discover WABA IDs from granular_scopes
  try {
    const debugRes = await fetch(
      `https://graph.facebook.com/debug_token?input_token=${token}&access_token=${token}`,
    );
    if (debugRes.ok) {
      const debugData = (await debugRes.json()) as {
        data?: {
          granular_scopes?: Array<{ scope: string; target_ids?: string[] }>;
        };
      };
      const scopes = debugData.data?.granular_scopes ?? [];
      const wabaIds = new Set<string>();
      for (const s of scopes) {
        if (s.target_ids) {
          for (const tid of s.target_ids) wabaIds.add(tid);
        }
      }
      for (const wabaId of wabaIds) {
        if (triedWabaIds.has(wabaId)) continue;
        const numbers = await fetchPhoneNumbersFromWaba(token, wabaId);
        if (numbers.length > 0) {
          allNumbers.push(...numbers);
          triedWabaIds.add(wabaId);
        }
      }
    }
  } catch {
    // fall through
  }

  // Strategy 4: query /me/accounts (business accounts linked to the user)
  if (allNumbers.length === 0) {
    try {
      const meRes = await fetch(`${WHATSAPP_API_BASE}/me/accounts?fields=id,name`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (meRes.ok) {
        const meData = (await meRes.json()) as { data?: Array<{ id: string; name?: string }> };
        for (const acct of meData.data ?? []) {
          if (triedWabaIds.has(acct.id)) continue;
          const numbers = await fetchPhoneNumbersFromWaba(token, acct.id);
          if (numbers.length > 0) {
            allNumbers.push(...numbers);
          }
        }
      }
    } catch {
      // all strategies failed
    }
  }

  if (allNumbers.length === 0) {
    return { id: "", error: `Could not resolve a WhatsApp phone number ID from "${providedId}". Make sure the access token has whatsapp_business_messaging permission and the phone number is registered.` };
  }

  // Pick the best phone number:
  // 1. Prefer verified numbers (code_verification_status === "VERIFIED")
  // 2. Among those, prefer non-test numbers (verified_name doesn't contain "test")
  // 3. Fall back to any non-test number
  // 4. Last resort: test number (Meta's default test number can send but isn't production)
  const verified = allNumbers.filter((n) => n.codeVerificationStatus === "VERIFIED");
  const nonTest = (verified.length > 0 ? verified : allNumbers).filter(
    (n) => !/test/i.test(n.verifiedName ?? ""),
  );
  const best = nonTest[0] ?? verified[0] ?? allNumbers[0];

  cachedPhoneNumberId = best.id;
  cachedAt = Date.now();
  return best;
}

/** Test the WhatsApp connection by resolving and fetching the phone number details. */
async function whatsappTestConnection(env: Env): Promise<Response> {
  if (!env.WHATSAPP_ACCESS_TOKEN || !env.WHATSAPP_PHONE_NUMBER_ID) {
    return Response.json({
      ok: false,
      connected: false,
      error: "WHATSAPP_ACCESS_TOKEN or WHATSAPP_PHONE_NUMBER_ID not configured",
    });
  }

  const resolved = await resolvePhoneNumberId(env);
  if (resolved.error || !resolved.id) {
    return Response.json({ ok: false, connected: false, error: resolved.error ?? "Failed to resolve phone number ID" });
  }

  // Check if the selected number is a test number (not production-ready)
  const isTestNumber = /test/i.test(resolved.verifiedName ?? "");
  const isVerified = resolved.codeVerificationStatus === "VERIFIED";

  return Response.json({
    ok: true,
    connected: true,
    phoneNumber: resolved.displayPhone ?? "resolved",
    businessName: resolved.verifiedName ?? "WhatsApp Business",
    phoneNumberId: resolved.id,
    verified: isVerified,
    warning: isTestNumber
      ? "Using Meta test number — your business number (+973 1725 3953) needs verification in Meta Business Manager before it can send messages."
      : !isVerified
        ? "Phone number is not verified — complete verification in Meta Business Manager."
        : undefined,
  });
}

/** Send a WhatsApp message (text and/or document with PDF attachment). */
async function whatsappSendMessage(
  req: WhatsAppSendRequest,
  env: Env,
): Promise<Response> {
  if (!req.to) {
    return Response.json({ ok: false, error: "Missing recipient phone number" }, { status: 400 });
  }

  const token = env.WHATSAPP_ACCESS_TOKEN;
  let phoneNumberId = req.phoneNumberId || cachedPhoneNumberId || "";

  // If no cached phone number ID, resolve it from the env var
  if (!phoneNumberId) {
    const resolved = await resolvePhoneNumberId(env);
    if (resolved.error || !resolved.id) {
      return Response.json({
        ok: false,
        error: resolved.error ?? "Failed to resolve WhatsApp phone number ID",
      }, { status: 500 });
    }
    phoneNumberId = resolved.id;
  }

  if (!token || !phoneNumberId) {
    return Response.json({
      ok: false,
      error: "WhatsApp not configured — set WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID",
    }, { status: 500 });
  }

  try {
    // If a PDF attachment is provided, first upload the media to WhatsApp.
    let mediaId: string | undefined;
    if (req.attachmentBase64 && req.attachmentName) {
      const mediaRes = await fetch(
        `${WHATSAPP_API_BASE}/${phoneNumberId}/media`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            type: "application/pdf",
            filename: req.attachmentName,
            // The Cloud API expects a data URL or an HTTPS URL for the media.
            // We pass it as a base64 data URL.
            // Note: for large PDFs you may need to host the file and pass a URL instead.
            url: `data:application/pdf;name=${req.attachmentName};base64,${req.attachmentBase64}`,
          }),
        },
      );

      if (mediaRes.ok) {
        const mediaData = (await mediaRes.json()) as { id?: string };
        mediaId = mediaData.id;
      } else {
        const errText = await mediaRes.text().catch(() => "media upload failed");
        console.error("[whatsapp] media upload failed", mediaRes.status, errText);
        // Continue without attachment if upload fails — send text only.
      }
    }

    // Send the message.
    let messageBody: Record<string, unknown>;

    if (mediaId) {
      // Document message with caption
      messageBody = {
        messaging_product: "whatsapp",
        to: req.to,
        type: "document",
        document: {
          id: mediaId,
          filename: req.attachmentName ?? "invoice.pdf",
          caption: req.body ?? "",
        },
      };
    } else {
      // Text-only message
      messageBody = {
        messaging_product: "whatsapp",
        to: req.to,
        type: "text",
        text: { body: req.body ?? "" },
      };
    }

    const sendRes = await fetch(
      `${WHATSAPP_API_BASE}/${phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(messageBody),
      },
    );

    if (!sendRes.ok) {
      const errText = await sendRes.text().catch(() => "WhatsApp API error");
      console.error("[whatsapp] send failed", sendRes.status, errText);
      return Response.json({ ok: false, error: `WhatsApp API ${sendRes.status}: ${errText}` }, { status: 502 });
    }

    const result = (await sendRes.json()) as {
      messages?: Array<{ id?: string }>;
    };
    const messageId = result.messages?.[0]?.id;
    return Response.json({ ok: true, messageId, sentTo: req.to });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[whatsapp] send failed", msg);
    return Response.json({ ok: false, error: msg }, { status: 500 });
  }
}

export default {
  // Worker entrypoint — routes HTTP, WebSocket, WhatsApp API, and webhook requests.
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/ping") {
      return Response.json({ ok: true, now: new Date().toISOString() });
    }

    // Email sending endpoint (HTTP POST) — Gmail API OAuth2.
    if (url.pathname === "/api/send-invoice" && request.method === "POST") {
      try {
        const req = (await request.json()) as SendInvoiceRequest;
        return sendInvoiceEmail(req, env);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Invalid JSON";
        return Response.json({ ok: false, error: msg }, { status: 400 });
      }
    }

    // ── WhatsApp Cloud API endpoints ──

    // Webhook verification (GET) — Meta calls this when you set up the webhook.
    if (url.pathname === "/api/whatsapp/webhook" && request.method === "GET") {
      return whatsappWebhookVerify(url, env);
    }

    // Webhook for delivery/read status updates (POST) — Meta sends status events here.
    if (url.pathname === "/api/whatsapp/webhook" && request.method === "POST") {
      return whatsappWebhookReceive(request, env);
    }

    // Test connection (POST) — checks that the access token + phone number ID are valid.
    if (url.pathname === "/api/whatsapp/test" && request.method === "POST") {
      return whatsappTestConnection(env);
    }

    // Send a WhatsApp message (POST) — text or document with optional PDF attachment.
    if (url.pathname === "/api/whatsapp/send" && request.method === "POST") {
      try {
        const req = (await request.json()) as WhatsAppSendRequest;
        return whatsappSendMessage(req, env);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Invalid JSON";
        return Response.json({ ok: false, error: msg }, { status: 400 });
      }
    }

    // Everything else (WebSocket upgrade + any HTTP) routes to the Workspace DO.
    // Use the 2-arg form so the Upgrade header is preserved.
    const wrapped = new Request(request.url, request);
    wrapped.headers.set("X-Rork-DO-Class", "Workspace");
    wrapped.headers.set("X-Rork-DO-Id", WORKSPACE_ID);
    return env.DO.fetch(wrapped);
  },
} satisfies ExportedHandler<Env>;
