import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";

import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { DataProvider } from "@/context/DataContext";

import { Layout } from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Owners from "./pages/Owners";
import Buildings from "./pages/Buildings";
import Units from "./pages/Units";
import Tenants from "./pages/Tenants";
import Leases from "./pages/Leases";
import Invoices from "./pages/Invoices";
import Payments from "./pages/Payments";
import Expenses from "./pages/Expenses";
import EWABills from "./pages/EWABills";
import EWAAccounts from "./pages/EWAAccounts";
import ChartOfAccounts from "./pages/ChartOfAccounts";
import JournalEntries from "./pages/JournalEntries";
import Distributions from "./pages/Distributions";
import OwnerDetail from "./pages/details/OwnerDetail";
import BuildingDetail from "./pages/details/BuildingDetail";
import UnitDetail from "./pages/details/UnitDetail";
import TenantDetail from "./pages/details/TenantDetail";
import LeaseDetail from "./pages/details/LeaseDetail";
import InvoiceDetail from "./pages/details/InvoiceDetail";
import PaymentDetail from "./pages/details/PaymentDetail";
import ExpenseDetail from "./pages/details/ExpenseDetail";
import EWABillDetail from "./pages/details/EWABillDetail";
import EWAAccountDetail from "./pages/details/EWAAccountDetail";
import AccountDetail from "./pages/details/AccountDetail";
import JournalEntryDetail from "./pages/details/JournalEntryDetail";
import DistributionDetail from "./pages/details/DistributionDetail";
import Complaints from "./pages/Complaints";
import Maintenance from "./pages/Maintenance";
import Vendors from "./pages/Vendors";
import Assets from "./pages/Assets";
import Documents from "./pages/Documents";
import Reports from "./pages/Reports";
import Users from "./pages/Users";
import HistoryPage from "./pages/History";
import WhatsAppSettings from "./pages/WhatsAppSettings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <DataProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <Routes>
              <Route path="/" element={<Layout />}>
                <Route index element={<Dashboard />} />
                <Route path="owners" element={<Owners />} />
                <Route path="owners/:id" element={<OwnerDetail />} />
                <Route path="buildings" element={<Buildings />} />
                <Route path="buildings/:id" element={<BuildingDetail />} />
                <Route path="units" element={<Units />} />
                <Route path="units/:id" element={<UnitDetail />} />
                <Route path="tenants" element={<Tenants />} />
                <Route path="tenants/:id" element={<TenantDetail />} />
                <Route path="leases" element={<Leases />} />
                <Route path="leases/:id" element={<LeaseDetail />} />
                <Route path="invoices" element={<Invoices />} />
                <Route path="invoices/:id" element={<InvoiceDetail />} />
                <Route path="payments" element={<Payments />} />
                <Route path="payments/:id" element={<PaymentDetail />} />
                <Route path="expenses" element={<Expenses />} />
                <Route path="expenses/:id" element={<ExpenseDetail />} />
                <Route path="ewa-bills" element={<EWABills />} />
                <Route path="ewa-bills/:id" element={<EWABillDetail />} />
                <Route path="ewa-accounts" element={<EWAAccounts />} />
                <Route path="ewa-accounts/:id" element={<EWAAccountDetail />} />
                <Route path="chart-of-accounts" element={<ChartOfAccounts />} />
                <Route path="chart-of-accounts/:id" element={<AccountDetail />} />
                <Route path="journal-entries" element={<JournalEntries />} />
                <Route path="journal-entries/:id" element={<JournalEntryDetail />} />
                <Route path="distributions" element={<Distributions />} />
                <Route path="distributions/:id" element={<DistributionDetail />} />
                <Route path="complaints" element={<Complaints />} />
                <Route path="maintenance" element={<Maintenance />} />
                <Route path="vendors" element={<Vendors />} />
                <Route path="assets" element={<Assets />} />
                <Route path="documents" element={<Documents />} />
                <Route path="reports" element={<Reports />} />
                <Route path="users" element={<Users />} />
                <Route path="whatsapp" element={<WhatsAppSettings />} />
                <Route path="history" element={<HistoryPage />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </DataProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
