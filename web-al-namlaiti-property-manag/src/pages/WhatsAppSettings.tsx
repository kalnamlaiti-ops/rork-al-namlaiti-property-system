import { useState, useMemo } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useData } from "@/context/DataContext";
import { useNavigate } from "react-router-dom";
import {
  MessageCircle,
  CheckCircle,
  XCircle,
  Loader2,
  RefreshCw,
  Send,
  Zap,
  AlertTriangle,
  Eye,
  Settings as SettingsIcon,
} from "lucide-react";
import { format } from "date-fns";
import type { WhatsAppLog } from "@/types";

export default function WhatsAppSettings() {
  const navigate = useNavigate();
  const {
    whatsappLogs,
    whatsappSettings,
    getWhatsAppSettings,
    updateWhatsAppSettings,
    testWhatsApp,
    resendWhatsAppMessage,
    sendAllInvoicesWhatsApp,
    getTenantById,
    getInvoiceById,
  } = useData();

  const settings = getWhatsAppSettings();
  const [testing, setTesting] = useState(false);
  const [sendingAll, setSendingAll] = useState(false);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [autoSend, setAutoSend] = useState(settings.autoSendEnabled);
  const [sendDay, setSendDay] = useState(settings.sendDayOfMonth);
  const [channel, setChannel] = useState(settings.channel);
  const [countryCode, setCountryCode] = useState(settings.defaultCountryCode);

  const handleTest = async () => {
    setTesting(true);
    try {
      await testWhatsApp();
    } finally {
      setTesting(false);
    }
  };

  const handleSaveSettings = () => {
    updateWhatsAppSettings({
      autoSendEnabled: autoSend,
      sendDayOfMonth: sendDay,
      channel,
      defaultCountryCode: countryCode,
    });
  };

  const handleSendAll = async () => {
    setSendingAll(true);
    try {
      await sendAllInvoicesWhatsApp();
    } finally {
      setSendingAll(false);
    }
  };

  const handleResend = async (logId: string) => {
    setResendingId(logId);
    try {
      await resendWhatsAppMessage(logId);
    } finally {
      setResendingId(null);
    }
  };

  // Stats
  const totalSent = whatsappLogs.filter((l) => l.status === "sent" || l.status === "delivered" || l.status === "read").length;
  const totalFailed = whatsappLogs.filter((l) => l.failed).length;
  const totalQueued = whatsappLogs.filter((l) => l.status === "queued").length;

  // Sort logs by sentAt desc
  const sortedLogs = useMemo(() => {
    return [...whatsappLogs].sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime());
  }, [whatsappLogs]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="WhatsApp Settings"
        subtitle="Manage WhatsApp invoice automation"
      />

      {/* Connection status */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${settings.connected ? "bg-emerald-50" : "bg-slate-100"}`}>
                <MessageCircle className={`h-6 w-6 ${settings.connected ? "text-emerald-600" : "text-slate-400"}`} />
              </div>
              <div>
                <h3 className="text-base font-semibold">Connection Status</h3>
                <p className="text-sm text-muted-foreground">
                  {settings.connected
                    ? "WhatsApp API is connected and ready"
                    : "WhatsApp API is not configured or not connected"}
                </p>
                {settings.lastTestedAt && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Last tested: {format(new Date(settings.lastTestedAt), "dd MMM yyyy HH:mm")}
                    {settings.lastTestOk === false && settings.lastTestError && (
                      <span className="text-red-600"> — {settings.lastTestError}</span>
                    )}
                  </p>
                )}
              </div>
            </div>
            <Button onClick={handleTest} disabled={testing} variant={settings.connected ? "outline" : "default"}>
              {testing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Zap className="mr-2 h-4 w-4" />}
              {testing ? "Testing..." : "Test Connection"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Automation settings */}
      <Card>
        <CardContent className="p-6">
          <div className="mb-4 flex items-center gap-2">
            <SettingsIcon className="h-5 w-5 text-primary" />
            <h3 className="text-base font-semibold">Automation Settings</h3>
          </div>

          <div className="space-y-4">
            {/* Auto-send toggle */}
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <p className="font-medium">Automatic Monthly Sending</p>
                <p className="text-sm text-muted-foreground">
                  Automatically send WhatsApp invoices on the {settings.sendDayOfMonth === 1 ? "1st" : `${settings.sendDayOfMonth}th`} of each month
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAutoSend(!autoSend)}
                className={`relative h-6 w-11 rounded-full transition-colors ${autoSend ? "bg-emerald-500" : "bg-slate-300"}`}
              >
                <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${autoSend ? "translate-x-5" : "translate-x-0.5"}`} />
              </button>
            </div>

            {/* Send day */}
            <div className="grid gap-2 sm:grid-cols-2">
              <div>
                <label className="text-sm font-medium">Send Day of Month</label>
                <Input
                  type="number"
                  min={1}
                  max={28}
                  value={sendDay}
                  onChange={(e) => setSendDay(Number(e.target.value) || 1)}
                  className="mt-1"
                />
                <p className="mt-1 text-xs text-muted-foreground">Day 1–28 (avoid 29–31 for month-length consistency)</p>
              </div>
              <div>
                <label className="text-sm font-medium">Default Country Code</label>
                <Input
                  type="text"
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value.replace(/\D/g, ""))}
                  placeholder="973"
                  className="mt-1"
                />
                <p className="mt-1 text-xs text-muted-foreground">Used to normalize local phone numbers (e.g. 973 for Bahrain)</p>
              </div>
            </div>

            {/* Channel */}
            <div>
              <label className="text-sm font-medium">Delivery Channel</label>
              <div className="mt-2 flex gap-2">
                <ChannelButton current={channel} value="whatsapp" onClick={setChannel} label="WhatsApp only" />
                <ChannelButton current={channel} value="email" onClick={setChannel} label="Email only" />
                <ChannelButton current={channel} value="both" onClick={setChannel} label="Both" />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Choose how invoices are delivered to tenants
              </p>
            </div>

            <div className="flex justify-end">
              <Button onClick={handleSaveSettings}>Save Settings</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-5">
            <p className="text-sm font-medium text-muted-foreground">Sent</p>
            <p className="mt-2 text-2xl font-bold text-emerald-600">{totalSent}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm font-medium text-muted-foreground">Failed</p>
            <p className="mt-2 text-2xl font-bold text-red-600">{totalFailed}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm font-medium text-muted-foreground">Queued</p>
            <p className="mt-2 text-2xl font-bold text-amber-600">{totalQueued}</p>
          </CardContent>
        </Card>
      </div>

      {/* Manual actions */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold">Manual Actions</h3>
              <p className="text-sm text-muted-foreground">Send all pending invoices via WhatsApp now</p>
            </div>
            <Button onClick={handleSendAll} disabled={sendingAll} variant="default">
              {sendingAll ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              {sendingAll ? "Sending..." : "Send All Pending"}
            </Button>
          </div>
          {settings.lastAutoRunAt && (
            <p className="mt-2 text-xs text-muted-foreground">
              Last automatic run: {format(new Date(settings.lastAutoRunAt), "dd MMM yyyy HH:mm")}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Message logs */}
      <Card>
        <CardContent className="p-0">
          <div className="border-b p-4">
            <h3 className="text-base font-semibold">Message Logs</h3>
            <p className="text-sm text-muted-foreground">All WhatsApp invoice messages and their delivery status</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Invoice</th>
                  <th className="px-4 py-3 text-left font-medium">Tenant</th>
                  <th className="px-4 py-3 text-left font-medium">Phone</th>
                  <th className="px-4 py-3 text-left font-medium">Month</th>
                  <th className="px-4 py-3 text-left font-medium">Sent</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                  <th className="px-4 py-3 text-left font-medium">Retries</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {sortedLogs.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                      No WhatsApp messages logged yet. Send an invoice via WhatsApp to see it here.
                    </td>
                  </tr>
                ) : (
                  sortedLogs.map((log) => (
                    <WhatsAppLogRow
                      key={log.id}
                      log={log}
                      tenantName={getTenantById(log.tenantId)?.name ?? "—"}
                      invoiceNumber={getInvoiceById(log.invoiceId)?.invoiceNumber ?? "—"}
                      resending={resendingId === log.id}
                      onResend={() => handleResend(log.id)}
                      onViewInvoice={() => navigate(`/invoices/${log.invoiceId}`)}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ChannelButton({
  current,
  value,
  onClick,
  label,
}: {
  current: string;
  value: "email" | "whatsapp" | "both";
  onClick: (v: "email" | "whatsapp" | "both") => void;
  label: string;
}) {
  const isActive = current === value;
  return (
    <button
      type="button"
      onClick={() => onClick(value)}
      className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
        isActive
          ? "border-primary bg-primary text-white"
          : "border-input bg-background text-foreground hover:bg-muted"
      }`}
    >
      {label}
    </button>
  );
}

function WhatsAppLogRow({
  log,
  tenantName,
  invoiceNumber,
  resending,
  onResend,
  onViewInvoice,
}: {
  log: WhatsAppLog;
  tenantName: string;
  invoiceNumber: string;
  resending: boolean;
  onResend: () => void;
  onViewInvoice: () => void;
}) {
  return (
    <tr className="hover:bg-muted/30">
      <td className="px-4 py-3 font-medium">{invoiceNumber}</td>
      <td className="px-4 py-3">{tenantName}</td>
      <td className="px-4 py-3 text-muted-foreground">{log.phoneNumber}</td>
      <td className="px-4 py-3">{log.billingMonth}</td>
      <td className="px-4 py-3 text-muted-foreground">
        {format(new Date(log.sentAt), "dd MMM yyyy HH:mm")}
      </td>
      <td className="px-4 py-3">
        <WhatsAppStatusBadge status={log.status} failed={log.failed} />
        {log.errorMessage && (
          <p className="mt-1 text-xs text-red-600 max-w-xs truncate" title={log.errorMessage}>
            {log.errorMessage}
          </p>
        )}
      </td>
      <td className="px-4 py-3">{log.retryCount}</td>
      <td className="px-4 py-3 text-right">
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="sm" onClick={onViewInvoice} title="View Invoice">
            <Eye className="h-3.5 w-3.5" />
          </Button>
          {(log.failed || log.status === "failed") && (
            <Button variant="ghost" size="sm" onClick={onResend} disabled={resending} title="Resend" className="text-amber-600">
              {resending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            </Button>
          )}
        </div>
      </td>
    </tr>
  );
}

function WhatsAppStatusBadge({ status, failed }: { status: string; failed?: boolean }) {
  if (failed || status === "failed") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700">
        <XCircle className="h-3 w-3" /> Failed
      </span>
    );
  }
  if (status === "sent") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700">
        <CheckCircle className="h-3 w-3" /> Sent
      </span>
    );
  }
  if (status === "delivered") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
        <CheckCircle className="h-3 w-3" /> Delivered
      </span>
    );
  }
  if (status === "read") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-purple-200 bg-purple-100 px-2.5 py-0.5 text-xs font-medium text-purple-700">
        <CheckCircle className="h-3 w-3" /> Read
      </span>
    );
  }
  if (status === "queued") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">
        <Loader2 className="h-3 w-3" /> Queued
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
      <AlertTriangle className="h-3 w-3" /> {status}
    </span>
  );
}
