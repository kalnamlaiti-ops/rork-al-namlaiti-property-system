// src/components/LiveIndicator.tsx
// Shows the real-time connection status in the header.
import { useData } from "@/context/DataContext";
import { Radio, Loader2, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";

export function LiveIndicator() {
  const { connectionStatus } = useData();

  const config = {
    connected: {
      icon: Radio,
      label: "Live",
      dot: "bg-emerald-500",
      text: "text-emerald-700",
      bg: "bg-emerald-50 border-emerald-200",
      pulse: true,
    },
    connecting: {
      icon: Loader2,
      label: "Connecting…",
      dot: "bg-amber-500",
      text: "text-amber-700",
      bg: "bg-amber-50 border-amber-200",
      pulse: false,
    },
    reconnecting: {
      icon: Loader2,
      label: "Reconnecting…",
      dot: "bg-amber-500",
      text: "text-amber-700",
      bg: "bg-amber-50 border-amber-200",
      pulse: false,
    },
    offline: {
      icon: WifiOff,
      label: "Offline",
      dot: "bg-slate-400",
      text: "text-slate-600",
      bg: "bg-slate-50 border-slate-200",
      pulse: false,
    },
  } as const;

  const c = config[connectionStatus] ?? config.offline;
  const Icon = c.icon;

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium",
        c.bg,
        c.text,
      )}
    >
      <Icon className={cn("h-3.5 w-3.5", connectionStatus === "connecting" || connectionStatus === "reconnecting" ? "animate-spin" : "")} />
      <span className={cn("h-1.5 w-1.5 rounded-full", c.dot, c.pulse && "animate-pulse")} />
      {c.label}
    </div>
  );
}
