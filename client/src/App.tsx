import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";

// Lazy-loaded pages — code-split for fast mobile initial load
const Portfolio           = lazy(() => import("./pages/Portfolio"));
const FAQ                 = lazy(() => import("./pages/FAQ"));
const NotFound            = lazy(() => import("./pages/NotFound"));
const LazyResidential     = lazy(() => import("./pages/services/index").then(m => ({ default: m.Residential })));
const LazyRemodels        = lazy(() => import("./pages/services/index").then(m => ({ default: m.Remodels })));
const LazyNewConstruction = lazy(() => import("./pages/services/index").then(m => ({ default: m.NewConstruction })));
const LazyRestoration     = lazy(() => import("./pages/services/index").then(m => ({ default: m.Restoration })));
const LazyOutdoor         = lazy(() => import("./pages/services/index").then(m => ({ default: m.Outdoor })));
const LazyPainting        = lazy(() => import("./pages/services/index").then(m => ({ default: m.Painting })));
const LazyRoofing         = lazy(() => import("./pages/services/index").then(m => ({ default: m.Roofing })));
const LazyCabinets        = lazy(() => import("./pages/services/index").then(m => ({ default: m.Cabinets })));

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="h-8 w-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" aria-label="Loading" />
    </div>
  );
}

function Router() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Switch>
        <Route path="/"                           component={Home} />
        <Route path="/portfolio"                  component={Portfolio} />
        <Route path="/faq"                        component={FAQ} />
        <Route path="/services/residential"       component={LazyResidential} />
        <Route path="/services/remodels"          component={LazyRemodels} />
        <Route path="/services/new-construction"  component={LazyNewConstruction} />
        <Route path="/services/restoration"       component={LazyRestoration} />
        <Route path="/services/outdoor"           component={LazyOutdoor} />
        <Route path="/services/painting"          component={LazyPainting} />
        <Route path="/services/roofing"           component={LazyRoofing} />
        <Route path="/services/cabinets"          component={LazyCabinets} />
        <Route path="/404"                        component={NotFound} />
        <Route                                    component={NotFound} />
      </Switch>
    </Suspense>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
