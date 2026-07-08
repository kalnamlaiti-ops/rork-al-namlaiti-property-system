// src/components/ShareButton.tsx
// Copies the current app URL so anyone with the link joins the same shared workspace.
import { useState } from "react";
import { Share2, Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useData } from "@/context/DataContext";

export function ShareButton() {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const { connectionStatus, actorLabel } = useData();

  const url = typeof window !== "undefined" ? window.location.origin + window.location.pathname : "";

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const ta = document.createElement("textarea");
      ta.value = url;
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand("copy"); } catch { /* ignore */ }
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Share2 className="h-4 w-4" />
          <span className="hidden sm:inline">Share</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5 text-primary" />
            Share this workspace
          </DialogTitle>
          <DialogDescription>
            Anyone with this link can view and edit the same data in real time. No sign-in required.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <code className="flex-1 truncate rounded-md border border-border bg-muted px-3 py-2 text-sm text-foreground">
              {url}
            </code>
            <Button onClick={copyLink} size="sm" className="gap-1.5">
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
          <div className="rounded-lg border border-border bg-muted/50 p-3 text-sm">
            <p className="font-medium text-foreground">You are: {actorLabel}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              This label is saved in your browser and attached to every change you make so the audit
              history can show who did what. Status: {connectionStatus}.
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            Open the link in another browser or send it to a teammate — they'll see the same records
            and every edit syncs live.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
