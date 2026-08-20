import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  Building2,
  Home,
  UserRound,
  FileText,
  Receipt,
  CreditCard,
  Wallet,
  Zap,
  BookOpen,
  NotebookPen,
  ArrowLeftRight,
  MessageSquareWarning,
  MessageCircle,
  Wrench,
  Truck,
  Box,
  FolderOpen,
  BarChart3,
  History,
  Shield,
  Ruler,
  LogOut,
} from "lucide-react";

const sidebarNav = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  {
    section: "PORTFOLIO",
    items: [
      { name: "Owners", href: "/owners", icon: Users },
      { name: "Buildings", href: "/buildings", icon: Building2 },
      { name: "Units", href: "/units", icon: Home },
    ],
  },
  {
    section: "TENANTS & LEASES",
    items: [
      { name: "Tenants", href: "/tenants", icon: UserRound },
      { name: "Leases", href: "/leases", icon: FileText },
    ],
  },
  {
    section: "FINANCE",
    items: [
      { name: "Invoices", href: "/invoices", icon: Receipt },
      { name: "Payments", href: "/payments", icon: CreditCard },
      { name: "Expenses", href: "/expenses", icon: Wallet },
      { name: "EWA Accounts", href: "/ewa-accounts", icon: Zap },
      { name: "EWA Bills", href: "/ewa-bills", icon: Zap },
      { name: "Chart of Accounts", href: "/chart-of-accounts", icon: BookOpen },
      { name: "Journal Entries", href: "/journal-entries", icon: NotebookPen },
      { name: "Distributions", href: "/distributions", icon: ArrowLeftRight },
    ],
  },
  {
    section: "OPERATIONS",
    items: [
      { name: "Complaints", href: "/complaints", icon: MessageSquareWarning },
      { name: "Maintenance", href: "/maintenance", icon: Wrench },
      { name: "Vendors", href: "/vendors", icon: Truck },
      { name: "Assets", href: "/assets", icon: Box },
      { name: "Documents", href: "/documents", icon: FolderOpen },
    ],
  },
  {
    section: "REPORTS",
    items: [{ name: "Reports", href: "/reports", icon: BarChart3 }],
  },
  {
    section: "ADMIN",
    items: [
      { name: "Users", href: "/users", icon: Shield },
      { name: "WhatsApp", href: "/whatsapp", icon: MessageCircle },
      { name: "Lease Calibration", href: "/lease-template-calibration", icon: Ruler },
      { name: "Audit History", href: "/history", icon: History },
    ],
  },
];

function SidebarItem({ item, onClick }: { item: { name: string; href: string; icon: React.ElementType }; onClick?: () => void }) {
  const location = useLocation();
  const isActive = location.pathname === item.href || (item.href !== "/" && location.pathname.startsWith(item.href));

  return (
    <NavLink
      to={item.href}
      onClick={onClick}
      className={cn(
        "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
        isActive
          ? "bg-primary text-white"
          : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
      )}
    >
      <item.icon className="h-4 w-4 shrink-0" />
      <span>{item.name}</span>
    </NavLink>
  );
}

export function Sidebar({ mobileOpen, setMobileOpen }: { mobileOpen: boolean; setMobileOpen: (open: boolean) => void }) {
  return (
    <>
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-64 transform bg-sidebar-background transition-transform md:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-full flex-col">
          <div className="flex h-16 items-center gap-3 px-6">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-white">
              <Building2 className="h-5 w-5" />
            </div>
            <span className="text-lg font-semibold text-white">PropVault</span>
          </div>

          <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
            <SidebarItem item={sidebarNav[0] as { name: string; href: string; icon: React.ElementType }} onClick={() => setMobileOpen(false)} />

            {sidebarNav.slice(1).map((group) => (
              <div key={group.section}>
                <p className="mb-2 px-3 text-xs font-semibold tracking-wider text-sidebar-foreground/60">
                  {group.section}
                </p>
                <div className="space-y-1">
                  {group.items.map((item) => (
                    <SidebarItem key={item.name} item={item} onClick={() => setMobileOpen(false)} />
                  ))}
                </div>
              </div>
            ))}
          </nav>

          <div className="border-t border-sidebar-border p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-medium text-white">
                S
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="truncate text-sm font-medium text-white">Super Admin</p>
                <p className="truncate text-xs text-sidebar-foreground">admin@propvault.com</p>
              </div>
              <button type="button" className="text-sidebar-foreground hover:text-white">
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}
    </>
  );
}
