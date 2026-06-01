import { useAuth } from "@/_core/hooks/useAuth";
import { AdminGuidePrompt } from "@/components/AdminGuidePrompt";
import { GuideHelpButton } from "@/components/GuideHelpButton";
import { getGuideByPath } from "@/pages/admin/guides-data";
import { ASSETS } from "@/const";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/useMobile";
import {
  BarChart3,
  Bell,
  BookOpen,
  Calendar,
  Camera,
  ClipboardList,
  CreditCard,
  HardHat,
  HelpCircle,
  Image,
  LayoutDashboard,
  LogOut,
  Layers,
  Package,
  PanelLeft,
  Pencil,
  Plus,
  Radio,
  Search,
  Settings,
  Shield,
  Sparkles,
  Users,
  Wrench,
} from "lucide-react";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from "./DashboardLayoutSkeleton";
import { Button } from "./ui/button";

type NavItem = {
  icon: typeof LayoutDashboard;
  label: string;
  path: string;
  badge?: string;
};

const BASE_NAV_SECTIONS: Array<{ label: string; items: NavItem[] }> = [
  {
    label: "Operations",
    items: [
      { icon: LayoutDashboard, label: "Command Center", path: "/admin" },
      { icon: ClipboardList, label: "Projects", path: "/admin/projects" },
      { icon: BookOpen, label: "Field Reports", path: "/admin/field-reports" },
      { icon: Calendar, label: "Schedule", path: "/admin/schedule" },
      { icon: Pencil, label: "Site Plans", path: "/admin/site-plans" },
      { icon: Radio, label: "Activity Log", path: "/admin/activity-log" },
    ],
  },
  {
    label: "Business",
    items: [
      { icon: Users, label: "Clients", path: "/admin/clients" },
      { icon: BarChart3, label: "Estimates", path: "/admin/estimates" },
      { icon: Package, label: "Materials", path: "/admin/materials" },
      {
        icon: Wrench,
        label: "Sub-Contractors",
        path: "/admin/sub-contractors",
      },
      { icon: Shield, label: "Ledger", path: "/admin/ledger" },
      { icon: CreditCard, label: "Billing", path: "/admin/billing" },
    ],
  },
  {
    label: "Insights & Platform",
    items: [
      { icon: BarChart3, label: "Analytics", path: "/admin/analytics" },
      { icon: Search, label: "Search", path: "/admin/search", badge: "⌘K" },
      { icon: Bell, label: "Notifications", path: "/admin/notifications" },
      { icon: Sparkles, label: "Finish Selections", path: "/admin/finishes" },
      {
        icon: Camera,
        label: "Vision Studio",
        path: "/admin/vision-studio",
        badge: "AI",
      },
      { icon: Image, label: "Portfolio CMS", path: "/admin/portfolio-cms" },
      { icon: Settings, label: "Platform Setup", path: "/admin/setup" },
      { icon: HelpCircle, label: "System Guide", path: "/admin/guides" },
    ],
  },
];

const NAV_SECTIONS: Array<{ label: string; items: NavItem[] }> =
  buildNavSections();

function buildNavSections() {
  const sections = BASE_NAV_SECTIONS.map(s => ({
    label: s.label,
    items: [...s.items],
  }));
  const blueprintEnabled = import.meta.env?.VITE_FEATURE_BLUEPRINT === "true";
  if (blueprintEnabled) {
    const biz = sections.find(s => s.label === "Business");
    biz?.items.push({
      icon: Layers,
      label: "Blueprint",
      path: "/admin/blueprint",
    });
  }
  return sections;
}

const NAV = NAV_SECTIONS.flatMap(section => section.items);

const QUICK_ACTIONS = [
  { icon: Plus, label: "New Project", path: "/admin/projects/new" },
  { icon: BookOpen, label: "New Report", path: "/admin/field-reports/new" },
  { icon: Search, label: "Search", path: "/admin/search" },
];

const SIDEBAR_WIDTH_KEY = "pcb-sidebar-width";
const DEFAULT_WIDTH = 264;
const MIN_WIDTH = 200;
const MAX_WIDTH = 360;

function getInitialSidebarWidth() {
  try {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    const parsed = saved ? parseInt(saved, 10) : NaN;
    if (Number.isFinite(parsed) && parsed >= MIN_WIDTH && parsed <= MAX_WIDTH) {
      return parsed;
    }
  } catch {
    // Ignore storage read failures (private browsing / restricted contexts).
  }
  return DEFAULT_WIDTH;
}

// Returns the NAV item that best matches the given location.
function getCurrentNavItem(location: string) {
  return NAV.find(
    item =>
      location === item.path ||
      (item.path !== "/admin" && location.startsWith(item.path))
  );
}

function getCurrentNavSection(location: string) {
  const currentItem = getCurrentNavItem(location);
  if (!currentItem) return null;
  return NAV_SECTIONS.find(section =>
    section.items.some(item => item.path === currentItem.path)
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarWidth, setSidebarWidth] = useState(getInitialSidebarWidth);
  const { loading, user, isAdmin } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
    } catch {
      // Ignore storage write failures.
    }
  }, [sidebarWidth]);

  // Cmd+K / Ctrl+K → navigate to search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setLocation("/admin/search");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [setLocation]);

  // Apply .admin-shell class to document.body so React portals
  // (Dropdown/Dialog/Popover/Toast — which mount outside the SidebarProvider
  // tree via document.body) inherit the admin light palette.
  //
  // Must be called here — before any conditional returns — to satisfy React's
  // Rules of Hooks: every hook must be called on every render in the same order.
  // The guard inside the effect body ensures the class is only added/removed
  // when the user is authenticated as an admin.
  useEffect(() => {
    if (!isAdmin) return;
    document.body.classList.add("admin-shell");
    return () => {
      document.body.classList.remove("admin-shell");
    };
  }, [isAdmin]);

  if (loading) return <DashboardLayoutSkeleton />;

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-6 p-8 max-w-sm w-full text-center">
          <div className="h-14 w-14 border border-primary/40 flex items-center justify-center">
            <HardHat className="h-7 w-7 text-primary" />
          </div>
          <div>
            <h1
              className="text-xl font-semibold tracking-tight mb-2"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Sign in to continue
            </h1>
            <p className="text-sm text-muted-foreground font-light">
              This area requires authentication.
            </p>
          </div>
          <Button
            size="lg"
            className="w-full bg-primary text-primary-foreground"
            asChild
          >
            <a href="/auth/login">Sign In</a>
          </Button>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-6 p-8 max-w-sm w-full text-center">
          <div className="h-14 w-14 border border-primary/40 flex items-center justify-center">
            <Shield className="h-7 w-7 text-destructive" />
          </div>
          <div>
            <h1
              className="text-xl font-semibold tracking-tight mb-2"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Admin Access Required
            </h1>
            <p className="text-sm text-muted-foreground font-light">
              This area is restricted to administrators.
            </p>
          </div>
          <div className="flex gap-3 w-full">
            <Button variant="outline" className="flex-1" asChild>
              <a href="/portal">Go to Portal</a>
            </Button>
            <Button
              className="flex-1 bg-primary text-primary-foreground"
              asChild
            >
              <a href="/">Home</a>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider
      className="admin-shell"
      style={{ "--sidebar-width": `${sidebarWidth}px` } as CSSProperties}
    >
      <DashboardLayoutContent setSidebarWidth={setSidebarWidth}>
        {children}
      </DashboardLayoutContent>
    </SidebarProvider>
  );
}

function DashboardLayoutContent({
  children,
  setSidebarWidth,
}: {
  children: React.ReactNode;
  setSidebarWidth: (w: number) => void;
}) {
  const { user, signOut } = useAuth();
  const [location, setLocation] = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const currentNav = getCurrentNavItem(location);
  const currentSection = getCurrentNavSection(location);
  const currentGuide = getGuideByPath(location);

  useEffect(() => {
    if (isCollapsed) setIsResizing(false);
  }, [isCollapsed]);

  useEffect(() => {
    // Use Pointer Events so the same handler works for mouse, touch, and pen.
    // Resizer is only mounted on desktop (see render guard below), but defensive
    // handlers here also tolerate touch in case devtools/responsive mode triggers them.
    const onMove = (e: PointerEvent) => {
      if (!isResizing) return;
      const left = sidebarRef.current?.getBoundingClientRect().left ?? 0;
      const w = e.clientX - left;
      if (w >= MIN_WIDTH && w <= MAX_WIDTH) setSidebarWidth(w);
    };
    const onUp = () => setIsResizing(false);
    if (isResizing) {
      document.addEventListener("pointermove", onMove);
      document.addEventListener("pointerup", onUp);
      document.addEventListener("pointercancel", onUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }
    return () => {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
      document.removeEventListener("pointercancel", onUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, setSidebarWidth]);

  const initials = user?.name
    ? user.name
        .split(" ")
        .map(n => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : (user?.email?.slice(0, 2).toUpperCase() ?? "U");

  return (
    <>
      <div className="relative" ref={sidebarRef}>
        <Sidebar collapsible="icon" className="border-r border-border/40">
          <SidebarHeader className="h-14 justify-center border-b border-border/40">
            <div className="flex items-center gap-2 px-2">
              <button
                onClick={toggleSidebar}
                className="h-8 w-8 flex items-center justify-center hover:bg-accent rounded transition-colors shrink-0"
                aria-label="Toggle navigation"
              >
                <PanelLeft className="h-4 w-4 text-muted-foreground" />
              </button>
              {!isCollapsed && (
                <a
                  href="/"
                  aria-label="Precision Core Builders — Home"
                  className="flex items-center min-w-0 flex-1"
                >
                  <img
                    src={ASSETS.logo}
                    alt="Precision Core Builders"
                    className="h-6 w-auto max-w-full object-contain"
                    width="140"
                    height="24"
                  />
                </a>
              )}
            </div>
            {!isCollapsed && (
              <div className="grid grid-cols-3 gap-1.5 px-2 pb-2">
                {QUICK_ACTIONS.map(action => (
                  <button
                    key={action.path}
                    onClick={() => setLocation(action.path)}
                    className="h-10 rounded border border-border/50 bg-background/60 hover:border-primary/40 hover:bg-primary/5 transition-colors flex items-center justify-center"
                    title={action.label}
                    aria-label={action.label}
                  >
                    <action.icon className="h-4 w-4 text-muted-foreground" />
                  </button>
                ))}
              </div>
            )}
          </SidebarHeader>

          <SidebarContent className="gap-0 py-2">
            {NAV_SECTIONS.map(section => (
              <SidebarGroup key={section.label} className="px-2 py-1">
                <SidebarGroupLabel className="px-2 text-[10px] tracking-[0.18em] uppercase">
                  {section.label}
                </SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {section.items.map(item => {
                      const isActive = currentNav?.path === item.path;
                      return (
                        <SidebarMenuItem key={item.path}>
                          <SidebarMenuButton
                            isActive={isActive}
                            onClick={() => setLocation(item.path)}
                            tooltip={item.label}
                            className="h-11 pr-8 text-sm"
                          >
                            <item.icon
                              className={`h-4 w-4 ${isActive ? "text-primary" : "text-muted-foreground"}`}
                            />
                            <span
                              className={
                                isActive
                                  ? "text-foreground font-medium"
                                  : "text-muted-foreground"
                              }
                            >
                              {item.label}
                            </span>
                          </SidebarMenuButton>
                          {item.badge && (
                            <SidebarMenuBadge className="text-[9px] font-semibold text-muted-foreground/90">
                              {item.badge}
                            </SidebarMenuBadge>
                          )}
                        </SidebarMenuItem>
                      );
                    })}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            ))}
          </SidebarContent>

          <SidebarFooter className="p-2 border-t border-border/40">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2.5 rounded px-2 py-1.5 hover:bg-accent/50 transition-colors w-full text-left min-h-[44px]">
                  <Avatar className="h-8 w-8 border border-border/60 shrink-0">
                    <AvatarFallback className="text-xs font-bold bg-primary/10 text-primary">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  {!isCollapsed && (
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold truncate leading-none">
                        {user?.name ?? "Admin"}
                      </p>
                      <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                        {user?.email}
                      </p>
                    </div>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem
                  onClick={() => setLocation("/admin/search")}
                  className="cursor-pointer"
                >
                  <Search className="mr-2 h-4 w-4" /> Search (⌘K)
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setLocation("/admin/setup")}
                  className="cursor-pointer"
                >
                  <Settings className="mr-2 h-4 w-4" /> Platform Setup
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setLocation("/admin/guides")}
                  className="cursor-pointer"
                >
                  <HelpCircle className="mr-2 h-4 w-4" /> System Guide
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <a href="/" className="cursor-pointer">
                    ← Public Site
                  </a>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={signOut}
                  className="cursor-pointer text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" /> Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>

        {!isMobile && !isCollapsed && (
          <div
            className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary/20 transition-colors z-50"
            onPointerDown={() => setIsResizing(true)}
          />
        )}
      </div>

      <SidebarInset>
        <AdminGuidePrompt />
        {!isMobile && (
          <div className="flex border-b border-border/40 h-16 items-center px-4 sm:px-6 bg-background/90 backdrop-blur-xl sticky top-0 z-30 gap-3">
            <SidebarTrigger className="!size-11 rounded flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p
                className="text-sm font-semibold text-foreground truncate leading-tight"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                {currentNav?.label ?? "Admin"}
              </p>
              <p
                className="text-[10px] tracking-widest uppercase text-muted-foreground/60 leading-tight"
                style={{ fontFamily: "var(--font-condensed)" }}
              >
                {currentSection?.label ?? "Operations"}
              </p>
            </div>
            {currentGuide && <GuideHelpButton guideId={currentGuide.id} />}
            <Button
              variant="outline"
              size="sm"
              className="h-11 hidden lg:inline-flex"
              onClick={() => setLocation("/admin/projects/new")}
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              New Project
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-11 hidden md:inline-flex"
              onClick={() => setLocation("/admin/field-reports/new")}
            >
              <BookOpen className="mr-1.5 h-3.5 w-3.5" />
              New Report
            </Button>
            <Button
              size="sm"
              className="h-11"
              onClick={() => setLocation("/admin/search")}
            >
              <Search className="mr-1.5 h-3.5 w-3.5" />
              Search
            </Button>
          </div>
        )}
        {isMobile && (
          <div
            className="flex border-b border-border/40 h-14 items-center px-3 bg-background/95 backdrop-blur-xl sticky top-0 z-40 gap-2"
            style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
          >
            <SidebarTrigger className="!size-11 rounded flex-shrink-0" />
            <a
              href="/"
              aria-label="Precision Core Builders — Home"
              className="flex items-center justify-center flex-shrink-0 min-h-[44px] min-w-[44px]"
            >
              <img
                src={ASSETS.logo}
                alt="Precision Core Builders"
                className="h-7 w-auto object-contain"
                width="120"
                height="28"
              />
            </a>
            <div className="flex-1 min-w-0 text-right">
              <p
                className="text-xs font-semibold text-foreground truncate leading-tight"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                {getCurrentNavItem(location)?.label ?? "Admin"}
              </p>
            </div>
            {currentGuide && <GuideHelpButton guideId={currentGuide.id} />}
            <button
              onClick={() => setLocation("/admin/search")}
              className="h-10 w-10 rounded-full border border-border/40 bg-background flex items-center justify-center flex-shrink-0 active:scale-95 transition-transform"
              aria-label="Search admin"
            >
              <Search className="h-4 w-4 text-muted-foreground" />
            </button>
            <button
              onClick={() => setLocation("/admin/field-reports/new")}
              className="h-10 w-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0 active:scale-95 transition-transform"
              aria-label="New field report"
            >
              <BookOpen className="h-4 w-4 text-primary" />
            </button>
          </div>
        )}
        <div className="flex-1 p-4 pb-24 sm:p-6 md:p-8">{children}</div>
      </SidebarInset>
    </>
  );
}
