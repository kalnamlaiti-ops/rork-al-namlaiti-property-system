import { useMemo, useState } from "react";
import { useData } from "@/context/DataContext";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  History as HistoryIcon,
  Search,
  PlusCircle,
  Pencil,
  Trash2,
  Trash,
  Download,
  ArrowRight,
  RotateCcw,
  Lock,
  ShieldCheck,
  Eye,
  EyeOff,
} from "lucide-react";
import type { HistoryEntry } from "@/types";

const HISTORY_UNLOCK_KEY = "al-namlaiti-history-unlocked";
const AUDIT_PASSWORD = "33804311";

function isUnlockedThisSession(): boolean {
  return sessionStorage.getItem(HISTORY_UNLOCK_KEY) === "true";
}

function setUnlockedThisSession(v: boolean) {
  if (v) sessionStorage.setItem(HISTORY_UNLOCK_KEY, "true");
  else sessionStorage.removeItem(HISTORY_UNLOCK_KEY);
}

const actionConfig: Record<
  string,
  { icon: React.ElementType; badge: string; rowAccent: string }
> = {
  Created: {
    icon: PlusCircle,
    badge: "bg-emerald-100 text-emerald-700 border-emerald-200",
    rowAccent: "border-l-4 border-l-emerald-400",
  },
  Edited: {
    icon: Pencil,
    badge: "bg-blue-100 text-blue-700 border-blue-200",
    rowAccent: "border-l-4 border-l-blue-400",
  },
  Deleted: {
    icon: Trash2,
    badge: "bg-red-100 text-red-700 border-red-200",
    rowAccent: "border-l-4 border-l-red-400",
  },
};

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function exportCsv(entries: HistoryEntry[]) {
  const headers = ["Timestamp", "Action", "Entity Type", "Entity Name", "Summary", "Changes"];
  const rows = entries.map((e) => [
    formatTimestamp(e.timestamp),
    e.action,
    e.entityType,
    e.entityName,
    e.summary,
    e.changes?.map((c) => `${c.field}: "${c.from}" → "${c.to}"`).join("; ") ?? "",
  ]);
  const csv = [headers, ...rows]
    .map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `audit-history-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function HistoryPage() {
  const { history, clearHistory, recoverEntity } = useData();
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [entityFilter, setEntityFilter] = useState<string>("all");
  const [selected, setSelected] = useState<HistoryEntry | undefined>();

  const [unlocked, setUnlocked] = useState<boolean>(() => isUnlockedThisSession());
  const [pwdInput, setPwdInput] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUnlock = () => {
    if (pwdInput === AUDIT_PASSWORD) {
      setUnlocked(true);
      setUnlockedThisSession(true);
      setError(null);
      setPwdInput("");
    } else {
      setError("Incorrect password. Please try again.");
    }
  };

  const handleLock = () => {
    setUnlocked(false);
    setUnlockedThisSession(false);
  };

  const entityTypes = useMemo(() => {
    const set = new Set<string>();
    history.forEach((h) => set.add(h.entityType));
    return Array.from(set).sort();
  }, [history]);

  const filtered = useMemo(() => {
    return history.filter((h) => {
      if (actionFilter !== "all" && h.action !== actionFilter) return false;
      if (entityFilter !== "all" && h.entityType !== entityFilter) return false;
      const q = search.toLowerCase().trim();
      if (!q) return true;
      return (
        h.entityName.toLowerCase().includes(q) ||
        h.entityType.toLowerCase().includes(q) ||
        h.summary.toLowerCase().includes(q)
      );
    });
  }, [history, search, actionFilter, entityFilter]);

  const counts = useMemo(() => {
    return {
      total: history.length,
      created: history.filter((h) => h.action === "Created").length,
      edited: history.filter((h) => h.action === "Edited").length,
      deleted: history.filter((h) => h.action === "Deleted").length,
    };
  }, [history]);

  if (!unlocked) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center px-4">
        <Card className="w-full max-w-sm">
          <CardContent className="p-6">
            <div className="mb-6 flex flex-col items-center text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-900 text-white">
                <Lock className="h-6 w-6" />
              </div>
              <h2 className="text-lg font-semibold text-foreground">Audit History Locked</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Enter the password to view the audit log.
              </p>
            </div>
            <div className="space-y-3">
              <div className="relative">
                <Input
                  type={showPwd ? "text" : "password"}
                  placeholder="Password"
                  value={pwdInput}
                  onChange={(e) => setPwdInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleUnlock()}
                  className="pr-10"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {error && (
                <p className="text-sm font-medium text-red-600">{error}</p>
              )}
              <Button className="w-full" onClick={handleUnlock}>
                <ShieldCheck className="mr-2 h-4 w-4" /> Unlock
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }


  const summaryCards = [
    { label: "Total Events", value: counts.total, color: "text-slate-700", bg: "bg-slate-50" },
    { label: "Created", value: counts.created, color: "text-emerald-700", bg: "bg-emerald-50" },
    { label: "Edited", value: counts.edited, color: "text-blue-700", bg: "bg-blue-50" },
    { label: "Deleted", value: counts.deleted, color: "text-red-700", bg: "bg-red-50" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit History"
        subtitle="Complete log of every created, edited, and deleted record"
        action={{ label: "Export CSV", onClick: () => exportCsv(filtered) }}
        secondaryAction={{
          label: "Clear History",
          onClick: clearHistory,
          variant: "outline",
        }}
      />

      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button variant="outline" size="sm" onClick={handleLock} className="text-slate-600">
          <Lock className="mr-2 h-4 w-4" /> Lock
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {summaryCards.map((c) => (
          <Card key={c.label}>
            <CardContent className="p-4">
              <div className={`mb-2 inline-flex rounded-md px-2 py-1 text-xs font-medium ${c.bg} ${c.color}`}>
                {c.label}
              </div>
              <p className="text-2xl font-bold text-foreground">{c.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by entity name, type, or summary..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-full lg:w-44">
                <SelectValue placeholder="Action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                <SelectItem value="Created">Created</SelectItem>
                <SelectItem value="Edited">Edited</SelectItem>
                <SelectItem value="Deleted">Deleted</SelectItem>
              </SelectContent>
            </Select>
            <Select value={entityFilter} onValueChange={setEntityFilter}>
              <SelectTrigger className="w-full lg:w-52">
                <SelectValue placeholder="Entity Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {entityTypes.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <HistoryIcon className="mb-3 h-10 w-10 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">
                {history.length === 0
                  ? "No history yet. Changes you make will appear here."
                  : "No events match your filters."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[140px]">Action</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead className="w-[180px]">Type</TableHead>
                    <TableHead className="w-[140px]">By</TableHead>
                    <TableHead className="w-[150px]">When</TableHead>
                    <TableHead className="w-[140px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((h) => {
                    const cfg = actionConfig[h.action] ?? actionConfig.Edited;
                    const Icon = cfg.icon;
                    return (
                      <TableRow key={h.id} className={cfg.rowAccent}>
                        <TableCell>
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${cfg.badge}`}
                          >
                            <Icon className="h-3 w-3" />
                            {h.action}
                          </span>
                        </TableCell>
                        <TableCell>
                          <p className="font-medium text-foreground">{h.entityName}</p>
                          <p className="text-xs text-muted-foreground">{h.summary}</p>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">{h.entityType}</span>
                        </TableCell>
                        <TableCell>
                          <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-600">
                            {h.actor ?? "unknown"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {formatTimestamp(h.timestamp)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            {h.action === "Deleted" && h.snapshot && !h.recovered && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => recoverEntity(h.id)}
                                className="h-8 gap-1 px-2 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"
                                title="Recover this deleted record"
                              >
                                <RotateCcw className="h-4 w-4" />
                                Recover
                              </Button>
                            )}
                            {h.action === "Deleted" && h.recovered && (
                              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                                <RotateCcw className="h-3 w-3" />
                                Recovered
                              </span>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelected(h)}
                              className="h-8 px-2"
                            >
                              <Search className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={Boolean(selected)} onOpenChange={() => setSelected(undefined)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selected && (() => {
                const cfg = actionConfig[selected.action] ?? actionConfig.Edited;
                const Icon = cfg.icon;
                return (
                  <>
                    <Icon className="h-5 w-5" />
                    {selected.action} — {selected.entityName}
                  </>
                );
              })()}
            </DialogTitle>
            <DialogDescription>
              {selected?.entityType} · {selected && formatTimestamp(selected.timestamp)} · by {selected?.actor ?? "unknown"}
            </DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="space-y-4 text-sm">
              <div>
                <p className="mb-1 font-medium text-foreground">Summary</p>
                <p className="text-muted-foreground">{selected.summary}</p>
                <p className="mt-2 text-xs text-muted-foreground">Performed by <span className="font-medium text-foreground">{selected.actor ?? "unknown"}</span></p>
              </div>

              {selected.action === "Deleted" && selected.snapshot && !selected.recovered ? (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                  <p className="text-sm font-medium text-emerald-800">
                    This record can be recovered.
                  </p>
                  <p className="text-xs text-emerald-700">
                    A full snapshot was saved at deletion time. Click “Recover Record” to restore it.
                  </p>
                </div>
              ) : selected.action === "Deleted" && selected.recovered ? (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                  <p className="text-sm font-medium text-emerald-800">
                    This record was recovered and is back in the system.
                  </p>
                </div>
              ) : null}

              {selected.changes && selected.changes.length > 0 ? (
                <div>
                  <p className="mb-2 font-medium text-foreground">
                    Field Changes ({selected.changes.length})
                  </p>
                  <div className="overflow-hidden rounded-lg border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Field</TableHead>
                          <TableHead>From</TableHead>
                          <TableHead className="w-[24px]"></TableHead>
                          <TableHead>To</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selected.changes.map((c, i) => (
                          <TableRow key={i}>
                            <TableCell className="font-medium">{c.field}</TableCell>
                            <TableCell className="text-muted-foreground line-through decoration-red-300">
                              {c.from}
                            </TableCell>
                            <TableCell>
                              <ArrowRight className="h-3 w-3 text-muted-foreground" />
                            </TableCell>
                            <TableCell className="font-medium text-emerald-700">{c.to}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground">
                  {selected.action === "Deleted"
                    ? "Record was removed. A snapshot was saved for recovery."
                    : "No individual field changes recorded."}
                </p>
              )}

              <div className="flex justify-end gap-2">
                {selected.action === "Deleted" && selected.snapshot && !selected.recovered && (
                  <Button
                    variant="outline"
                    className="text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"
                    onClick={() => {
                      recoverEntity(selected.id);
                      setSelected(undefined);
                    }}
                  >
                    <RotateCcw className="mr-2 h-4 w-4" /> Recover Record
                  </Button>
                )}
                {selected.action === "Deleted" && selected.recovered && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700">
                    <RotateCcw className="h-4 w-4" />
                    This record has been recovered
                  </span>
                )}
                <Button variant="outline" onClick={() => exportCsv([selected])}>
                  <Download className="mr-2 h-4 w-4" /> Export This Entry
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {history.length > 0 && (
        <p className="text-center text-xs text-muted-foreground">
          Showing {filtered.length} of {history.length} events · History keeps the most recent 500
          events
        </p>
      )}
    </div>
  );
}
