import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { toast } from "sonner";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import PlatformAuth from "./pages/platform/PlatformAuth";
import PlatformDashboardPage from "./pages/platform/PlatformDashboardPage";
import PlatformDirectoryPage from "./pages/platform/PlatformDirectoryPage";
import PlatformSchoolsPage from "./pages/platform/PlatformSchoolsPage";
import PlatformUpdatePassword from "./pages/platform/PlatformUpdatePassword";
import PlatformRecoverMaster from "./pages/platform/PlatformRecoverMaster";
import TenantAuth from "./pages/tenant/TenantAuth";
import TenantDashboard from "./pages/tenant/TenantDashboard";
import TeacherDashboard from "./pages/tenant/TeacherDashboard";
import HrDashboard from "./pages/tenant/HrDashboard";
import AccountantDashboard from "./pages/tenant/AccountantDashboard";
import MarketingDashboard from "./pages/tenant/MarketingDashboard";
import StudentDashboard from "./pages/tenant/StudentDashboard";
import ParentDashboard from "./pages/tenant/ParentDashboard";
import TenantBootstrap from "./pages/tenant/TenantBootstrap";
import OwnerDashboard from "./pages/tenant/OwnerDashboard";

const queryClient = new QueryClient();

export default function App() {
  // Prevent single failing async task from hard-crashing the whole shell (white screen)
  useEffect(() => {
    const handleRejection = (event: PromiseRejectionEvent) => {
      console.error("Unhandled rejection:", event.reason);
      toast.error("An unexpected error occurred. Please try again.");
      event.preventDefault();
    };

    // Global Enter key: if focused element is inside a dialog/form, submit the closest form or click the primary button
    const handleGlobalEnter = (event: KeyboardEvent) => {
      if (event.key !== "Enter") return;
      const target = event.target as HTMLElement;
      // Skip if target is a textarea or already a button/link
      if (target.tagName === "TEXTAREA" || target.tagName === "BUTTON" || target.tagName === "A") return;
      // Skip if inside a select/combobox
      if (target.closest("[role='listbox']") || target.closest("[role='combobox']")) return;

      // Find closest dialog content and click its primary (last) button
      const dialog = target.closest("[role='dialog']");
      if (dialog) {
        const footer = dialog.querySelector("[class*='DialogFooter'], footer");
        if (footer) {
          const buttons = footer.querySelectorAll("button:not([disabled])");
          const primary = buttons[buttons.length - 1] as HTMLButtonElement | undefined;
          if (primary) {
            event.preventDefault();
            primary.click();
          }
        }
      }
    };

    window.addEventListener("unhandledrejection", handleRejection);
    window.addEventListener("keydown", handleGlobalEnter);
    return () => {
      window.removeEventListener("unhandledrejection", handleRejection);
      window.removeEventListener("keydown", handleGlobalEnter);
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<PlatformAuth />} />
            <Route path="/auth/update-password" element={<PlatformUpdatePassword />} />
            <Route path="/auth/recover-master" element={<PlatformRecoverMaster />} />
            {/* Global Super Admin (platform-level) */}
            <Route path="/super_admin" element={<PlatformDashboardPage />} />
            <Route path="/super_admin/directory" element={<PlatformDirectoryPage />} />
            <Route path="/super_admin/schools" element={<PlatformSchoolsPage />} />

            {/* Back-compat aliases */}
            <Route path="/platform" element={<Navigate to="/super_admin" replace />} />
            <Route path="/platform/directory" element={<Navigate to="/super_admin/directory" replace />} />
            <Route path="/platform/schools" element={<Navigate to="/super_admin/schools" replace />} />

            <Route path="/:schoolSlug/auth" element={<TenantAuth />} />
            <Route path="/:schoolSlug/bootstrap" element={<TenantBootstrap />} />
            <Route path="/:schoolSlug/teacher/*" element={<TeacherDashboard />} />
            <Route path="/:schoolSlug/hr/*" element={<HrDashboard />} />
            <Route path="/:schoolSlug/accountant/*" element={<AccountantDashboard />} />
            <Route path="/:schoolSlug/marketing/*" element={<MarketingDashboard />} />
            <Route path="/:schoolSlug/student/*" element={<StudentDashboard />} />
            <Route path="/:schoolSlug/parent/*" element={<ParentDashboard />} />
            <Route path="/:schoolSlug/school_owner/*" element={<OwnerDashboard />} />
            <Route path="/:schoolSlug/:role/*" element={<TenantDashboard />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

