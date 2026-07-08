// functions/index.ts — Worker entrypoint.
// Routes WebSocket upgrades and HTTP requests to the shared Workspace DO.
// Sends invoice emails via the Gmail API (OAuth2) from namlity@gmail.com.

export { Workspace } from "./workspace";

type Env = {
  DO: Fetcher;
  // Gmail OAuth2 credentials — set as project env vars (secrets).
  GMAIL_CLIENT_ID?: string;
  GMAIL_CLIENT_SECRET?: string;
  GMAIL_REFRESH_TOKEN?: string;
  GMAIL_SENDER?: string; // e.g. "namlity@gmail.com"
};

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

export default {
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

    // Everything else (WebSocket upgrade + any HTTP) routes to the Workspace DO.
    // Use the 2-arg form so the Upgrade header is preserved.
    const wrapped = new Request(request.url, request);
    wrapped.headers.set("X-Rork-DO-Class", "Workspace");
    wrapped.headers.set("X-Rork-DO-Id", WORKSPACE_ID);
    return env.DO.fetch(wrapped);
  },
} satisfies ExportedHandler<Env>;
