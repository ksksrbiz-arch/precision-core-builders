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
import { ProtectedRoute } from "./components/RouteGuards";
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
const VisionStudio = lazy(() => import("./pages/VisionStudio"));

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
        <Route path="/vision-studio" component={VisionStudio} />

        {/* Auth */}
        <Route path="/auth/login" component={AuthLogin} />
        <Route path="/auth/callback" component={AuthCallback} />
        <Route path="/auth/resend" component={ResendLink} />
        <Route path="/dev-login" component={DevLogin} />

        {/* Admin */}
        <Route path="/admin" component={CommandCenter} />
        <Route path="/admin/projects" component={ProjectsList} />
        <Route path="/admin/projects/new" component={ProjectNew} />
        <Route path="/admin/projects/:id" component={ProjectDetail} />
        <Route path="/admin/field-reports/new" component={FieldReportNew} />
        <Route path="/admin/field-reports/:id" component={FieldReportDetail} />
        <Route path="/admin/field-reports" component={FieldReportsList} />
        <Route path="/admin/clients/:id" component={ClientDetail} />
        <Route path="/admin/clients" component={ClientsList} />
        <Route path="/admin/estimates" component={EstimatesList} />
        <Route path="/admin/sub-contractors" component={SubContractorsList} />
        <Route path="/admin/ledger" component={LedgerView} />
        <Route path="/admin/site-plans" component={SitePlanBuilder} />
        <Route path="/admin/guides" component={Guides} />
        <Route path="/admin/schedule" component={ScheduleView} />
        <Route path="/admin/materials" component={MaterialsView} />
        <Route path="/admin/billing" component={BillingView} />
        <Route path="/admin/portfolio-cms" component={PortfolioAdmin} />
        <Route path="/admin/setup" component={SetupWizard} />

        {/* Public token-gated onboarding wizard for new account owner */}
        <Route path="/onboarding" component={OnboardingWizard} />
        <Route path="/admin/vision-studio" component={VisionStudioAdmin} />
        <Route path="/admin/search" component={SearchView} />
        <Route path="/admin/finishes" component={FinishSelectionsAdmin} />
        <Route path="/admin/analytics" component={Analytics} />
        <Route path="/admin/activity-log" component={ActivityLog} />
        <Route path="/admin/notifications" component={NotificationsView} />
        {blueprintEnabled && (
          <Route path="/admin/blueprint" component={BlueprintTools} />
        )}

        {/* Client portal — auth required */}
        <Route path="/portal">
          {() => (
            <ProtectedRoute>
              <PortalDashboard />
            </ProtectedRoute>
          )}
        </Route>
        <Route path="/portal/reports">
          {() => (
            <ProtectedRoute>
              <PortalReports />
            </ProtectedRoute>
          )}
        </Route>
        <Route path="/portal/finishes">
          {() => (
            <ProtectedRoute>
              <PortalFinishes />
            </ProtectedRoute>
          )}
        </Route>
        <Route path="/portal/ledger">
          {() => (
            <ProtectedRoute>
              <PortalLedger />
            </ProtectedRoute>
          )}
        </Route>
        <Route path="/portal/payments">
          {() => (
            <ProtectedRoute>
              <PortalPayments />
            </ProtectedRoute>
          )}
        </Route>
        {blueprintEnabled && (
          <Route path="/portal/blueprint">
            {() => (
              <ProtectedRoute>
                <PortalBlueprint />
              </ProtectedRoute>
            )}
          </Route>
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
