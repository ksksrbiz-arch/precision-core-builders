import { lazy, Suspense } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ToastProvider } from "./components/ToastProvider";
import { MobileBottomNav } from "./components/MobileBottomNav";
import { NetworkStatus } from "./components/NetworkStatus";
import {
  PWAInstallPrompt,
  IOSInstallHint,
} from "./components/PWAInstallPrompt";
import {
  ScrollProgressBar,
  BackToTop,
  SkipToContent,
} from "./components/SiteEnhancements";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AdminRoute, ProtectedRoute } from "./components/RouteGuards";
import type { ComponentType } from "react";

/** Wrap a lazy-loaded page component with the AdminRoute guard. */
function adminPage<P extends object>(Component: ComponentType<P>) {
  return (props: P) => (
    <AdminRoute>
      <Component {...props} />
    </AdminRoute>
  );
}

/** Wrap a lazy-loaded page component with the ProtectedRoute guard. */
function protectedPage<P extends object>(Component: ComponentType<P>) {
  return (props: P) => (
    <ProtectedRoute>
      <Component {...props} />
    </ProtectedRoute>
  );
}
import Home from "./pages/Home";

// Public pages
const Portfolio = lazy(() => import("./pages/Portfolio"));
const PortfolioDetail = lazy(() => import("./pages/PortfolioDetail"));
const FAQ = lazy(() => import("./pages/FAQ"));
const Estimator = lazy(() => import("./pages/Estimator"));
const About = lazy(() => import("./pages/About"));
const Services = lazy(() => import("./pages/Services"));
const Contact = lazy(() => import("./pages/Contact"));
const NotFound = lazy(() => import("./pages/NotFound"));

// Auth pages
const AuthLogin = lazy(() => import("./pages/auth/Login"));
const AuthCallback = lazy(() => import("./pages/auth/Callback"));
const ResendLink = lazy(() => import("./pages/auth/ResendLink"));
const DevLogin = lazy(() => import("./pages/auth/DevLogin"));

// Admin pages
const CommandCenter = lazy(() => import("./pages/admin/CommandCenter"));
const ProjectsList = lazy(() => import("./pages/admin/ProjectsList"));
const ProjectNew = lazy(() => import("./pages/admin/ProjectNew"));
const ProjectDetail = lazy(() => import("./pages/admin/ProjectDetail"));
const FieldReportNew = lazy(() => import("./pages/admin/FieldReportNew"));
const FieldReportDetail = lazy(() => import("./pages/admin/FieldReportDetail"));
const SitePlanBuilder = lazy(() => import("./pages/admin/SitePlanBuilder"));
const Guides = lazy(() => import("./pages/admin/Guides"));
const ScheduleView = lazy(() => import("./pages/admin/ScheduleView"));
const MaterialsView = lazy(() => import("./pages/admin/MaterialsView"));
const BillingView = lazy(() => import("./pages/admin/BillingView"));
const PortfolioAdmin = lazy(() => import("./pages/admin/PortfolioAdmin"));
const SetupWizard = lazy(() => import("./pages/admin/SetupWizard"));
const OnboardingWizard = lazy(() => import("./pages/OnboardingWizard"));
const FieldReportsList = lazy(() => import("./pages/admin/FieldReportsList"));
const ClientsList = lazy(() => import("./pages/admin/ClientsList"));
const ClientDetail = lazy(() => import("./pages/admin/ClientDetail"));
const EstimatesList = lazy(() => import("./pages/admin/EstimatesList"));
const SubContractorsList = lazy(
  () => import("./pages/admin/SubContractorsList")
);
const LedgerView = lazy(() => import("./pages/admin/LedgerView"));
const VisionStudioAdmin = lazy(() => import("./pages/admin/VisionStudio"));
const SearchView = lazy(() => import("./pages/admin/Search"));
const FinishSelectionsAdmin = lazy(
  () => import("./pages/admin/FinishSelectionsAdmin")
);
const Analytics = lazy(() => import("./pages/admin/Analytics"));
const ActivityLog = lazy(() => import("./pages/admin/ActivityLog"));
const NotificationsView = lazy(() => import("./pages/admin/NotificationsView"));
const BlueprintTools = lazy(() => import("./pages/admin/BlueprintTools"));

// Portal pages
const PortalDashboard = lazy(() => import("./pages/portal/PortalDashboard"));
const PortalReports = lazy(() => import("./pages/portal/PortalReports"));
const PortalFinishes = lazy(() => import("./pages/portal/PortalFinishes"));
const PortalLedger = lazy(() => import("./pages/portal/PortalLedger"));
const PortalPayments = lazy(() => import("./pages/portal/PortalPayments"));
const PortalBlueprint = lazy(() => import("./pages/portal/PortalBlueprint"));

// Service pages
const LazyResidential = lazy(() =>
  import("./pages/services/index").then(m => ({ default: m.Residential }))
);
const LazyRemodels = lazy(() =>
  import("./pages/services/index").then(m => ({ default: m.Remodels }))
);
const LazyNewConstruction = lazy(() =>
  import("./pages/services/index").then(m => ({ default: m.NewConstruction }))
);
const LazyRestoration = lazy(() =>
  import("./pages/services/index").then(m => ({ default: m.Restoration }))
);
const LazyOutdoor = lazy(() =>
  import("./pages/services/index").then(m => ({ default: m.Outdoor }))
);
const LazyPainting = lazy(() =>
  import("./pages/services/index").then(m => ({ default: m.Painting }))
);
const LazyRoofing = lazy(() =>
  import("./pages/services/index").then(m => ({ default: m.Roofing }))
);
const LazyCabinets = lazy(() =>
  import("./pages/services/index").then(m => ({ default: m.Cabinets }))
);

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div
        className="h-8 w-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin"
        aria-label="Loading"
      />
    </div>
  );
}

function Router() {
  const blueprintEnabled = import.meta.env.VITE_FEATURE_BLUEPRINT === "true";
  return (
    <Suspense fallback={<PageLoader />}>
      <Switch>
        {/* Public */}
        <Route path="/" component={Home} />
        <Route path="/about" component={About} />
        <Route path="/services" component={Services} />
        <Route path="/portfolio" component={Portfolio} />
        <Route path="/portfolio/:slug" component={PortfolioDetail} />
        <Route path="/faq" component={FAQ} />
        <Route path="/contact" component={Contact} />
        <Route path="/estimator" component={Estimator} />

        {/* Auth */}
        <Route path="/auth/login" component={AuthLogin} />
        <Route path="/auth/callback" component={AuthCallback} />
        <Route path="/callback" component={AuthCallback} />
        <Route path="/auth/resend" component={ResendLink} />
        <Route path="/dev-login" component={DevLogin} />

        {/* Admin — all routes require role=admin via AdminRoute guard.
            /admin/setup is intentionally NOT wrapped because it has its
            own bootstrapping token flow used before an admin exists. */}
        <Route path="/admin" component={adminPage(CommandCenter)} />
        <Route path="/admin/projects" component={adminPage(ProjectsList)} />
        <Route path="/admin/projects/new" component={adminPage(ProjectNew)} />
        <Route
          path="/admin/projects/:id"
          component={adminPage(ProjectDetail)}
        />
        <Route
          path="/admin/field-reports/new"
          component={adminPage(FieldReportNew)}
        />
        <Route
          path="/admin/field-reports/:id"
          component={adminPage(FieldReportDetail)}
        />
        <Route
          path="/admin/field-reports"
          component={adminPage(FieldReportsList)}
        />
        <Route path="/admin/clients/:id" component={adminPage(ClientDetail)} />
        <Route path="/admin/clients" component={adminPage(ClientsList)} />
        <Route path="/admin/estimates" component={adminPage(EstimatesList)} />
        <Route
          path="/admin/sub-contractors"
          component={adminPage(SubContractorsList)}
        />
        <Route path="/admin/ledger" component={adminPage(LedgerView)} />
        <Route
          path="/admin/site-plans"
          component={adminPage(SitePlanBuilder)}
        />
        <Route path="/admin/guides" component={adminPage(Guides)} />
        <Route path="/admin/schedule" component={adminPage(ScheduleView)} />
        <Route path="/admin/materials" component={adminPage(MaterialsView)} />
        <Route path="/admin/billing" component={adminPage(BillingView)} />
        <Route
          path="/admin/portfolio-cms"
          component={adminPage(PortfolioAdmin)}
        />
        {/* Bootstrapping wizard — guarded by its own token, not AdminRoute. */}
        <Route path="/admin/setup" component={SetupWizard} />

        {/* Public token-gated onboarding wizard for new account owner */}
        <Route path="/onboarding" component={OnboardingWizard} />
        <Route
          path="/admin/vision-studio"
          component={adminPage(VisionStudioAdmin)}
        />
        <Route path="/admin/search" component={adminPage(SearchView)} />
        <Route
          path="/admin/finishes"
          component={adminPage(FinishSelectionsAdmin)}
        />
        <Route path="/admin/analytics" component={adminPage(Analytics)} />
        <Route path="/admin/activity-log" component={adminPage(ActivityLog)} />
        <Route
          path="/admin/notifications"
          component={adminPage(NotificationsView)}
        />
        {blueprintEnabled && (
          <Route
            path="/admin/blueprint"
            component={adminPage(BlueprintTools)}
          />
        )}

        {/* Client portal — auth required */}
        <Route path="/portal" component={protectedPage(PortalDashboard)} />
        <Route
          path="/portal/reports"
          component={protectedPage(PortalReports)}
        />
        <Route
          path="/portal/finishes"
          component={protectedPage(PortalFinishes)}
        />
        <Route path="/portal/ledger" component={protectedPage(PortalLedger)} />
        <Route
          path="/portal/payments"
          component={protectedPage(PortalPayments)}
        />
        {blueprintEnabled && (
          <Route
            path="/portal/blueprint"
            component={protectedPage(PortalBlueprint)}
          />
        )}

        {/* Service pages */}
        <Route path="/services/residential" component={LazyResidential} />
        <Route path="/services/remodels" component={LazyRemodels} />
        <Route
          path="/services/new-construction"
          component={LazyNewConstruction}
        />
        <Route path="/services/restoration" component={LazyRestoration} />
        <Route path="/services/outdoor" component={LazyOutdoor} />
        <Route path="/services/painting" component={LazyPainting} />
        <Route path="/services/roofing" component={LazyRoofing} />
        <Route path="/services/cabinets" component={LazyCabinets} />

        <Route path="/404" component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <ToastProvider>
          <TooltipProvider>
            <SkipToContent />
            <ScrollProgressBar />
            <NetworkStatus />
            <div id="main-content">
              <Router />
            </div>
            <MobileBottomNav />
            <BackToTop />
            <PWAInstallPrompt />
            <IOSInstallHint />
          </TooltipProvider>
        </ToastProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
