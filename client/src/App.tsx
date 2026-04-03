import { lazy, Suspense, useEffect } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch, useLocation } from "wouter";
import { CookieConsent } from "./components/CookieConsent";
import ErrorBoundary from "./components/ErrorBoundary";
import { MobileBottomNav } from "./components/MobileBottomNav";
import { NetworkStatus } from "./components/NetworkStatus";
import {
  PWAInstallPrompt,
  IOSInstallHint,
} from "./components/PWAInstallPrompt";
import { ThemeProvider } from "./contexts/ThemeContext";
import { withAdminGuard } from "./components/AdminGuard";
import Home from "./pages/Home";

// Public pages
const Portfolio = lazy(() => import("./pages/Portfolio"));
const FAQ = lazy(() => import("./pages/FAQ"));
const Estimator = lazy(() => import("./pages/Estimator"));
const About = lazy(() => import("./pages/About"));
const Services = lazy(() => import("./pages/Services"));
const Contact = lazy(() => import("./pages/Contact"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Privacy = lazy(() => import("./pages/legal/Privacy"));
const Terms = lazy(() => import("./pages/legal/Terms"));
const HowItWorks = lazy(() => import("./pages/HowItWorks"));
const VisionStudio = lazy(() => import("./pages/VisionStudio"));

// Auth pages
const AuthLogin = lazy(() => import("./pages/auth/Login"));
const AuthCallback = lazy(() => import("./pages/auth/Callback"));

// Admin pages
const CommandCenter = lazy(() => import("./pages/admin/CommandCenter"));
const ProjectsList = lazy(() => import("./pages/admin/ProjectsList"));
const ProjectDetail = lazy(() => import("./pages/admin/ProjectDetail"));
const FieldReportNew = lazy(() => import("./pages/admin/FieldReportNew"));
const SitePlanBuilder = lazy(() => import("./pages/admin/SitePlanBuilder"));
const Guides = lazy(() => import("./pages/admin/Guides"));
const ScheduleView = lazy(() => import("./pages/admin/ScheduleView"));
const MaterialsView = lazy(() => import("./pages/admin/MaterialsView"));
const BillingView = lazy(() => import("./pages/admin/BillingView"));
const PortfolioAdmin = lazy(() => import("./pages/admin/PortfolioAdmin"));
const SetupWizard = lazy(() => import("./pages/admin/SetupWizard"));
const FieldReportsList = lazy(() => import("./pages/admin/FieldReportsList"));
const ClientsList = lazy(() => import("./pages/admin/ClientsList"));
const ClientDetail = lazy(() => import("./pages/admin/ClientDetail"));
const EstimatesList = lazy(() => import("./pages/admin/EstimatesList"));
const SubContractorsList = lazy(
  () => import("./pages/admin/SubContractorsList")
);
const LedgerView = lazy(() => import("./pages/admin/LedgerView"));
const VisionStudioAdmin = lazy(() => import("./pages/admin/VisionStudio"));
const DevDash = lazy(() => import("./pages/admin/DevDash"));

// Portal pages
const PortalDashboard = lazy(() => import("./pages/portal/PortalDashboard"));
const PortalReports = lazy(() => import("./pages/portal/PortalReports"));
const PortalFinishes = lazy(() => import("./pages/portal/PortalFinishes"));
const PortalLedger = lazy(() => import("./pages/portal/PortalLedger"));

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
      <div className="flex flex-col items-center gap-4">
        <div
          className="h-8 w-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin"
          aria-label="Loading"
        />
        <div className="shimmer-gold h-1 w-32 rounded-full" />
      </div>
    </div>
  );
}

/** Scroll to top on route change */
function ScrollToTop() {
  const [location] = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [location]);
  return null;
}

function Router() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Switch>
        {/* Public */}
        <Route path="/" component={Home} />
        <Route path="/about" component={About} />
        <Route path="/services" component={Services} />
        <Route path="/portfolio" component={Portfolio} />
        <Route path="/faq" component={FAQ} />
        <Route path="/contact" component={Contact} />
        <Route path="/estimator" component={Estimator} />
        <Route path="/vision-studio" component={VisionStudio} />
        <Route path="/how-it-works" component={HowItWorks} />

        {/* Auth */}
        <Route path="/auth/login" component={AuthLogin} />
        <Route path="/auth/callback" component={AuthCallback} />

        {/* Admin (protected) */}
        <Route path="/admin" component={withAdminGuard(CommandCenter)} />
        <Route path="/admin/projects" component={withAdminGuard(ProjectsList)} />
        <Route path="/admin/projects/:id" component={withAdminGuard(ProjectDetail)} />
        <Route path="/admin/field-reports/new" component={withAdminGuard(FieldReportNew)} />
        <Route path="/admin/field-reports" component={withAdminGuard(FieldReportsList)} />
        <Route path="/admin/clients/:id" component={withAdminGuard(ClientDetail)} />
        <Route path="/admin/clients" component={withAdminGuard(ClientsList)} />
        <Route path="/admin/estimates" component={withAdminGuard(EstimatesList)} />
        <Route path="/admin/sub-contractors" component={withAdminGuard(SubContractorsList)} />
        <Route path="/admin/ledger" component={withAdminGuard(LedgerView)} />
        <Route path="/admin/site-plans" component={withAdminGuard(SitePlanBuilder)} />
        <Route path="/admin/guides" component={withAdminGuard(Guides)} />
        <Route path="/admin/schedule" component={withAdminGuard(ScheduleView)} />
        <Route path="/admin/materials" component={withAdminGuard(MaterialsView)} />
        <Route path="/admin/billing" component={withAdminGuard(BillingView)} />
        <Route path="/admin/portfolio-cms" component={withAdminGuard(PortfolioAdmin)} />
        <Route path="/admin/setup" component={withAdminGuard(SetupWizard)} />
        <Route path="/admin/vision-studio" component={withAdminGuard(VisionStudioAdmin)} />
        <Route path="/admin/dev" component={withAdminGuard(DevDash)} />

        {/* Client portal */}
        <Route path="/portal" component={PortalDashboard} />
        <Route path="/portal/reports" component={PortalReports} />
        <Route path="/portal/finishes" component={PortalFinishes} />
        <Route path="/portal/ledger" component={PortalLedger} />

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

        {/* Legal */}
        <Route path="/privacy" component={Privacy} />
        <Route path="/terms" component={Terms} />

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
        <TooltipProvider>
          <NetworkStatus />
          <Toaster />
          <ScrollToTop />
          <Router />
          <MobileBottomNav />
          <PWAInstallPrompt />
          <IOSInstallHint />
          <CookieConsent />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
