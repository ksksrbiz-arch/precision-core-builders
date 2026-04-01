import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarInset,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger, useSidebar,
} from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/useMobile";
import {
  BarChart3, BookOpen, Calendar, ClipboardList, HardHat, HelpCircle, LayoutDashboard, LogOut,
  Package, PanelLeft, Pencil, Shield, Users, Wrench,
} from "lucide-react";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from "./DashboardLayoutSkeleton";
import { Button } from "./ui/button";

const NAV = [
  { icon: LayoutDashboard, label: "Command Center",    path: "/admin" },
  { icon: ClipboardList,   label: "Projects",          path: "/admin/projects" },
  { icon: Users,           label: "Clients",           path: "/admin/clients" },
  { icon: BookOpen,        label: "Field Reports",     path: "/admin/field-reports" },
  { icon: Pencil,          label: "Site Plans",         path: "/admin/site-plans" },
  { icon: Calendar,        label: "Schedule",          path: "/admin/schedule" },
  { icon: BarChart3,       label: "Estimates",         path: "/admin/estimates" },
  { icon: Package,         label: "Materials",         path: "/admin/materials" },
  { icon: Wrench,          label: "Sub-Contractors",   path: "/admin/sub-contractors" },
  { icon: Shield,          label: "Ledger",            path: "/admin/ledger" },
  { icon: HelpCircle,      label: "System Guide",      path: "/admin/guides" },
];

const SIDEBAR_WIDTH_KEY = "pcb-sidebar-width";
const DEFAULT_WIDTH = 240;
const MIN_WIDTH = 200;
const MAX_WIDTH = 360;

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
  });
  const { loading, user } = useAuth();

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  if (loading) return <DashboardLayoutSkeleton />;

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-6 p-8 max-w-sm w-full text-center">
          <div className="h-14 w-14 border border-primary/40 flex items-center justify-center">
            <HardHat className="h-7 w-7 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight mb-2" style={{ fontFamily: "var(--font-heading)" }}>
              Sign in to continue
            </h1>
            <p className="text-sm text-muted-foreground font-light">
              This area requires authentication.
            </p>
          </div>
          <Button size="lg" className="w-full bg-primary text-primary-foreground" asChild>
            <a href="/auth/login">Sign In</a>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider style={{ "--sidebar-width": `${sidebarWidth}px` } as CSSProperties}>
      <DashboardLayoutContent setSidebarWidth={setSidebarWidth}>
        {children}
      </DashboardLayoutContent>
    </SidebarProvider>
  );
}

function DashboardLayoutContent({
  children, setSidebarWidth,
}: { children: React.ReactNode; setSidebarWidth: (w: number) => void }) {
  const { user, signOut } = useAuth();
  const [location, setLocation] = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (isCollapsed) setIsResizing(false);
  }, [isCollapsed]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const left = sidebarRef.current?.getBoundingClientRect().left ?? 0;
      const w = e.clientX - left;
      if (w >= MIN_WIDTH && w <= MAX_WIDTH) setSidebarWidth(w);
    };
    const onUp = () => setIsResizing(false);
    if (isResizing) {
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, setSidebarWidth]);

  const initials = user?.name
    ? user.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
    : user?.email?.slice(0, 2).toUpperCase() ?? "U";

  return (
    <>
      <div className="relative" ref={sidebarRef}>
        <Sidebar collapsible="icon" className="border-r border-border/40">
          <SidebarHeader className="h-14 justify-center border-b border-border/40">
            <div className="flex items-center gap-3 px-2">
              <button
                onClick={toggleSidebar}
                className="h-8 w-8 flex items-center justify-center hover:bg-accent rounded transition-colors shrink-0"
                aria-label="Toggle navigation"
              >
                <PanelLeft className="h-4 w-4 text-muted-foreground" />
              </button>
              {!isCollapsed && (
                <span className="text-xs font-bold tracking-widest uppercase text-muted-foreground truncate"
                      style={{ fontFamily: "var(--font-condensed)" }}>
                  Precision Core
                </span>
              )}
            </div>
          </SidebarHeader>

          <SidebarContent className="gap-0 py-2">
            <SidebarMenu className="px-2">
              {NAV.map(item => {
                const isActive = location === item.path ||
                  (item.path !== "/admin" && location.startsWith(item.path));
                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      isActive={isActive}
                      onClick={() => setLocation(item.path)}
                      tooltip={item.label}
                      className="h-9"
                    >
                      <item.icon className={`h-4 w-4 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                      <span className={isActive ? "text-foreground font-medium" : "text-muted-foreground"}>
                        {item.label}
                      </span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
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
                      <p className="text-xs font-semibold truncate leading-none">{user?.name ?? "Admin"}</p>
                      <p className="text-[10px] text-muted-foreground truncate mt-0.5">{user?.email}</p>
                    </div>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem asChild>
                  <a href="/" className="cursor-pointer">← Public Site</a>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={signOut} className="cursor-pointer text-destructive focus:text-destructive">
                  <LogOut className="mr-2 h-4 w-4" /> Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>

        {!isCollapsed && (
          <div
            className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary/20 transition-colors z-50"
            onMouseDown={() => setIsResizing(true)}
          />
        )}
      </div>

      <SidebarInset>
        {isMobile && (
          <div className="flex border-b border-border/40 h-14 items-center px-3 bg-background/95 backdrop-blur-xl sticky top-0 z-40 gap-3"
               style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}>
            <SidebarTrigger className="h-10 w-10 rounded flex-shrink-0" />
            <span
              className="text-xs font-bold tracking-widest uppercase text-muted-foreground truncate flex-1"
              style={{ fontFamily: "var(--font-condensed)" }}
            >
              Precision Core
            </span>
            <button
              onClick={() => setLocation("/admin/field-reports/new")}
              className="h-10 w-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0 active:scale-95 transition-transform"
              aria-label="New field report"
            >
              <BookOpen className="h-4 w-4 text-primary" />
            </button>
          </div>
        )}
        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </SidebarInset>
    </>
  );
}
