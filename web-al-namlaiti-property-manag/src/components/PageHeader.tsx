import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Plus } from "lucide-react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: {
    label: string;
    onClick?: () => void;
  };
  secondaryAction?: {
    label: string;
    onClick?: () => void;
    variant?: "outline" | "secondary" | "ghost";
  };
  className?: string;
}

export function PageHeader({ title, subtitle, action, secondaryAction, className }: PageHeaderProps) {
  return (
    <div className={cn("mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between", className)}>
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-2">
        {secondaryAction && (
          <Button variant={secondaryAction.variant ?? "outline"} onClick={secondaryAction.onClick}>
            {secondaryAction.label}
          </Button>
        )}
        {action && (
          <Button onClick={action.onClick}>
            <Plus className="mr-2 h-4 w-4" />
            {action.label}
          </Button>
        )}
      </div>
    </div>
  );
}
