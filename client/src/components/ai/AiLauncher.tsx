/**
 * AiLauncher — one-tap access to every AI tool from any admin page.
 *
 * Eric's #1 onsite need is reaching the AI without hunting across pages. This
 * mounts a floating "Assist" button (above the mobile bottom nav) that opens a
 * full-height side panel with:
 *   - big shortcut buttons to the page-based tools (Voice Report, Photo, Search)
 *   - the two conversational tools (Digital Foreman chat + live Ops Co-pilot)
 *     inline, voice-enabled, so he can just talk.
 */
import AIChatBox from "@/components/AIChatBox";
import OpsCopilot from "@/components/OpsCopilot";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Camera, Mic, Search, Sparkles } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";

type Tab = "ask" | "ops";

const SHORTCUTS = [
  {
    label: "Voice Report",
    href: "/admin/field-reports/new",
    icon: Mic,
    hint: "Dictate a field update",
  },
  {
    label: "Photo Analysis",
    href: "/admin/vision-studio",
    icon: Camera,
    hint: "Snap a site photo",
  },
  {
    label: "Search",
    href: "/admin/search",
    icon: Search,
    hint: "Find anything",
  },
];

export function AiLauncher() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("ask");
  const [, setLocation] = useLocation();

  const go = (href: string) => {
    setOpen(false);
    setLocation(href);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open AI assistant"
        className="fixed right-4 bottom-20 sm:right-6 sm:bottom-6 z-40 flex items-center gap-2 h-14 pl-4 pr-5 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/25 active:scale-95 transition-transform"
        style={{ fontFamily: "var(--font-condensed)" }}
      >
        <Sparkles className="h-5 w-5" />
        <span className="text-sm font-bold tracking-widest uppercase">
          Assist
        </span>
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-[460px] p-0 flex flex-col gap-0"
        >
          <SheetHeader className="px-4 py-3 border-b border-border/40">
            <SheetTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4 text-primary" />
              AI Assistant
            </SheetTitle>
          </SheetHeader>

          {/* Page-tool shortcuts */}
          <div className="grid grid-cols-3 gap-2 p-3 border-b border-border/40">
            {SHORTCUTS.map(s => (
              <button
                key={s.label}
                onClick={() => go(s.href)}
                className="flex flex-col items-center justify-center gap-1.5 min-h-20 p-2 rounded-lg border border-border/50 hover:border-primary/40 hover:bg-primary/5 active:scale-95 transition"
              >
                <s.icon className="h-6 w-6 text-primary" />
                <span className="text-xs font-semibold text-center leading-tight">
                  {s.label}
                </span>
              </button>
            ))}
          </div>

          {/* Conversational tool switcher */}
          <div className="flex gap-1 p-2 border-b border-border/40">
            <button
              onClick={() => setTab("ask")}
              className={`flex-1 min-h-11 rounded-md text-sm font-semibold transition ${
                tab === "ask"
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted"
              }`}
            >
              Ask the Foreman
            </button>
            <button
              onClick={() => setTab("ops")}
              className={`flex-1 min-h-11 rounded-md text-sm font-semibold transition ${
                tab === "ops"
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted"
              }`}
            >
              Ops Co-pilot
            </button>
          </div>

          <div className="flex-1 min-h-0 p-3">
            {tab === "ask" ? <AIChatBox /> : <OpsCopilot />}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
