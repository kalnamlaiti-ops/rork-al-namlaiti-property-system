import { cn } from "@/lib/utils";

type StatusBadgeProps = {
  status: string;
  className?: string;
};

const statusStyles: Record<string, string> = {
  Active: "bg-emerald-100 text-emerald-700 border-emerald-200",
  Inactive: "bg-slate-100 text-slate-600 border-slate-200",
  Occupied: "bg-emerald-100 text-emerald-700 border-emerald-200",
  Vacant: "bg-blue-100 text-blue-700 border-blue-200",
  Maintenance: "bg-amber-100 text-amber-700 border-amber-200",
  Reserved: "bg-purple-100 text-purple-700 border-purple-200",
  Paid: "bg-emerald-100 text-emerald-700 border-emerald-200",
  Sent: "bg-blue-100 text-blue-700 border-blue-200",
  Partial: "bg-amber-100 text-amber-700 border-amber-200",
  Overdue: "bg-red-100 text-red-700 border-red-200",
  Draft: "bg-slate-100 text-slate-600 border-slate-200",
  Cancelled: "bg-slate-100 text-slate-500 border-slate-200",
  Pending: "bg-amber-100 text-amber-700 border-amber-200",
  Invoiced: "bg-blue-100 text-blue-700 border-blue-200",
  Approved: "bg-blue-100 text-blue-700 border-blue-200",
  Rejected: "bg-red-100 text-red-700 border-red-200",
  Open: "bg-red-100 text-red-700 border-red-200",
  "In Progress": "bg-blue-100 text-blue-700 border-blue-200",
  Resolved: "bg-emerald-100 text-emerald-700 border-emerald-200",
  Closed: "bg-slate-100 text-slate-600 border-slate-200",
  Completed: "bg-emerald-100 text-emerald-700 border-emerald-200",
  Unpaid: "bg-red-100 text-red-700 border-red-200",
  Processed: "bg-blue-100 text-blue-700 border-blue-200",
  Low: "bg-slate-100 text-slate-600 border-slate-200",
  Medium: "bg-amber-100 text-amber-700 border-amber-200",
  High: "bg-orange-100 text-orange-700 border-orange-200",
  Urgent: "bg-red-100 text-red-700 border-red-200",
  Furnished: "bg-emerald-100 text-emerald-700 border-emerald-200",
  Unfurnished: "bg-slate-100 text-slate-600 border-slate-200",
  "Semi-Furnished": "bg-amber-100 text-amber-700 border-amber-200",
  Individual: "bg-blue-100 text-blue-700 border-blue-200",
  Company: "bg-purple-100 text-purple-700 border-purple-200",
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        statusStyles[status] ?? "bg-slate-100 text-slate-600 border-slate-200",
        className,
      )}
    >
      {status}
    </span>
  );
}
