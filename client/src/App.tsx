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
  StickyEstimateCTA,
} from "./components/SiteEnhancements";
import { ThemeProvider } from "./contexts/ThemeContext";
import { PageTransition } from "./components/ui/PageTransition";
import { AdminRoute, ProtectedRoute } from "./components/RouteGuards";
import type { ComponentType } from "react";

/**
 * Wrap a page component in its own ErrorBoundary so a crash in one route is
 * isolated to that route instead of blanking the whole app. The global
 * ErrorBoundary in App() remains as a final safety net.
 */
function withBoundary<P extends object>(Component: ComponentType<P>) {
  return (props: P) => (
    <ErrorBoundary>
      <Component {...props} />
    </ErrorBoundary>
  );
}

/** Wrap a lazy-loaded page component with the AdminRoute guard. */
function adminPage<P extends object>(Component: ComponentType<P>) {
  return (props: P) => (
    <ErrorBoundary>
      <AdminRoute>
        <Component {...props} />
      </AdminRoute>
    </ErrorBoundary>
  );
}

/** Wrap a lazy-loaded page component with the ProtectedRoute guard. */
function protectedPage<P extends object>(Component: ComponentType<P>) {
  return (props: P) => (
    <ErrorBoundary>
      <ProtectedRoute>
        <Component {...props} />
      </ProtectedRoute>
    </ErrorBoundary>
  );
}
const Home = lazy(() => import("./pages/Home"));

// Public pages
const Portfolio = lazy(() => import("./pages/Portfolio"));
const PortfolioDetail = lazy(() => import("./pages/PortfolioDetail"));
const FAQ = lazy(() => import("./pages/FAQ"));
const Estimator = lazy(() => import("./pages/Estimator"));
const About = lazy(() => import("./pages/About"));
const Services = lazy(() => import("./pages/Services"));
const Blog = lazy(() => import("./pages/Blog"));
const LazyKitchenRemodelCost = lazy(() =>
  import("./pages/blog/index").then(m => ({
    default: m.KitchenRemodelCost,
  }))
);
const LazyCCBLicensingGuide = lazy(() =>
  import("./pages/blog/index").then(m => ({
    default: m.CCBLicensingGuide,
  }))
);
const LazyTadlockResidenceCaseStudy = lazy(() =>
  import("./pages/blog/index").then(m => ({
    default: m.TadlockResidenceCaseStudy,
  }))
);
const LazyDeckCostEugene = lazy(() =>
  import("./pages/blog/index").then(m => ({
    default: m.DeckCostEugene,
  }))
);
const LazyBathroomRemodelCostEugene = lazy(() =>
  import("./pages/blog/index").then(m => ({
    default: m.BathroomRemodelCostEugene,
  }))
);
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
const EstimateEditor = lazy(() => import("./pages/admin/EstimateEditor"));
const SubContractorsList = lazy(
  () => import("./pages/admin/SubContractorsList")
);
const VendorsList = lazy(() => import("./pages/admin/VendorsList"));
const LedgerView = lazy(() => import("./pages/admin/LedgerView"));
const VisionStudioAdmin = lazy(() => import("./pages/admin/VisionStudio"));
const SearchView = lazy(() => import("./pages/admin/Search"));
const FinishSelectionsAdmin = lazy(
  () => import("./pages/admin/FinishSelectionsAdmin")
);
const Analytics = lazy(() => import("./pages/admin/Analytics"));
const ProfitabilityView = lazy(() => import("./pages/admin/ProfitabilityView"));
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

// Location (service-area) pages
const LazySpringfield = lazy(() =>
  import("./pages/locations/index").then(m => ({ default: m.Springfield }))
);
const LazyCoburg = lazy(() =>
  import("./pages/locations/index").then(m => ({ default: m.Coburg }))
);
const LazyCreswell = lazy(() =>
  import("./pages/locations/index").then(m => ({ default: m.Creswell }))
);
const LazyCottageGrove = lazy(() =>
  import("./pages/locations/index").then(m => ({ default: m.CottageGrove }))
);
const LazyJunctionCity = lazy(() =>
  import("./pages/locations/index").then(m => ({ default: m.JunctionCity }))
);
const LazyFlorence = lazy(() =>
  import("./pages/locations/index").then(m => ({ default: m.Florence }))
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
      <PageTransition>
        <Switch>
          {/* Public */}
          <Route path="/" component={withBoundary(Home)} />
          <Route path="/about" component={withBoundary(About)} />
          <Route path="/services" component={withBoundary(Services)} />

          {/* Blog */}
          <Route path="/blog" component={withBoundary(Blog)} />
          <Route
            path="/blog/kitchen-remodel-cost-eugene-oregon"
            component={withBoundary(LazyKitchenRemodelCost)}
          />
          <Route
            path="/blog/verify-oregon-ccb-license"
            component={withBoundary(LazyCCBLicensingGuide)}
          />
          <Route
            path="/blog/tadlock-residence-case-study"
            component={withBoundary(LazyTadlockResidenceCaseStudy)}
          />
          <Route
            path="/blog/deck-cost-eugene-oregon"
            component={withBoundary(LazyDeckCostEugene)}
          />
          <Route
            path="/blog/bathroom-remodel-cost-eugene-oregon"
            component={withBoundary(LazyBathroomRemodelCostEugene)}
          />
          <Route path="/portfolio" component={withBoundary(Portfolio)} />
          <Route
            path="/portfolio/:slug"
            component={withBoundary(PortfolioDetail)}
          />
          <Route path="/faq" component={withBoundary(FAQ)} />
          <Route path="/contact" component={withBoundary(Contact)} />
          <Route path="/estimator" component={withBoundary(Estimator)} />

          {/* Auth */}
          <Route path="/auth/login" component={withBoundary(AuthLogin)} />
          <Route path="/auth/callback" component={withBoundary(AuthCallback)} />
          <Route path="/callback" component={withBoundary(AuthCallback)} />
          <Route path="/auth/resend" component={withBoundary(ResendLink)} />
          <Route path="/dev-login" component={withBoundary(DevLogin)} />

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
          <Route
            path="/admin/clients/:id"
            component={adminPage(ClientDetail)}
          />
          <Route path="/admin/clients" component={adminPage(ClientsList)} />
          <Route
            path="/admin/estimates/new"
            component={adminPage(EstimateEditor)}
          />
          <Route
            path="/admin/estimates/:id/edit"
            component={adminPage(EstimateEditor)}
          />
          <Route path="/admin/estimates" component={adminPage(EstimatesList)} />
          <Route
            path="/admin/sub-contractors"
            component={adminPage(SubContractorsList)}
          />
          <Route path="/admin/vendors" component={adminPage(VendorsList)} />
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
          <Route path="/admin/setup" component={withBoundary(SetupWizard)} />

          {/* Public token-gated onboarding wizard for new account owner */}
          <Route
            path="/onboarding"
            component={withBoundary(OnboardingWizard)}
          />
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
          <Route
            path="/admin/profitability"
            component={adminPage(ProfitabilityView)}
          />
          <Route
            path="/admin/activity-log"
            component={adminPage(ActivityLog)}
          />
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
          <Route
            path="/portal/ledger"
            component={protectedPage(PortalLedger)}
          />
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
          <Route
            path="/services/residential"
            component={withBoundary(LazyResidential)}
          />
          <Route
            path="/services/remodels"
            component={withBoundary(LazyRemodels)}
          />
          <Route
            path="/services/new-construction"
            component={withBoundary(LazyNewConstruction)}
          />
          <Route
            path="/services/restoration"
            component={withBoundary(LazyRestoration)}
          />
          <Route
            path="/services/outdoor"
            component={withBoundary(LazyOutdoor)}
          />
          <Route
            path="/services/painting"
            component={withBoundary(LazyPainting)}
          />
          <Route
            path="/services/roofing"
            component={withBoundary(LazyRoofing)}
          />
          <Route
            path="/services/cabinets"
            component={withBoundary(LazyCabinets)}
          />

          {/* Location (service-area) pages */}
          <Route
            path="/service-areas/springfield"
            component={withBoundary(LazySpringfield)}
          />
          <Route
            path="/service-areas/coburg"
            component={withBoundary(LazyCoburg)}
          />
          <Route
            path="/service-areas/creswell"
            component={withBoundary(LazyCreswell)}
          />
          <Route
            path="/service-areas/cottage-grove"
            component={withBoundary(LazyCottageGrove)}
          />
          <Route
            path="/service-areas/junction-city"
            component={withBoundary(LazyJunctionCity)}
          />
          <Route
            path="/service-areas/florence"
            component={withBoundary(LazyFlorence)}
          />

          <Route path="/404" component={withBoundary(NotFound)} />
          <Route component={withBoundary(NotFound)} />
        </Switch>
      </PageTransition>
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
            <StickyEstimateCTA />
            <PWAInstallPrompt />
            <IOSInstallHint />
          </TooltipProvider>
        </ToastProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
