/**
 * Admin Guides — Comprehensive how-to for every system.
 * No fluff. No runaround. Just what you need to know.
 */
import DashboardLayout from "@/components/DashboardLayout";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  Lightbulb,
  Search,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { GUIDES, type Guide, type GuideSection } from "./guides-data";

// ── Section renderer ──────────────────────────────────────────────────────

function GuideSectionBlock({ section, index }: { section: GuideSection; index: number }) {
  return (
    <div className="space-y-3">
      {section.body && (
        <p className="text-sm text-foreground/80 leading-relaxed">{section.body}</p>
      )}

      {section.steps && section.steps.length > 0 && (
        <div className="space-y-1">
          {section.steps.map((step, i) => (
            <div
              key={i}
              className="flex gap-3 py-2 px-3 rounded-md hover:bg-muted/30 transition-colors"
            >
              <div className="flex-shrink-0 h-6 w-6 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mt-0.5">
                <span className="text-xs font-bold text-primary">{i + 1}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">{step.action}</p>
                {step.detail && (
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                    {step.detail}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {section.tips && section.tips.length > 0 && (
        <div className="bg-amber-500/5 border border-amber-500/20 rounded-md p-3 space-y-2">
          <div className="flex items-center gap-1.5 text-amber-500">
            <Lightbulb className="h-3.5 w-3.5" />
            <span className="text-xs font-bold uppercase tracking-wider">Pro Tips</span>
          </div>
          {section.tips.map((tip, i) => (
            <div key={i} className="flex gap-2 items-start">
              <ChevronRight className="h-3 w-3 text-amber-500/60 mt-1 flex-shrink-0" />
              <p className="text-xs text-foreground/70 leading-relaxed">{tip}</p>
            </div>
          ))}
        </div>
      )}

      {section.warning && (
        <div className="bg-red-500/5 border border-red-500/20 rounded-md p-3 flex gap-2 items-start">
          <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-red-400/90 leading-relaxed font-medium">
            {section.warning}
          </p>
        </div>
      )}
    </div>
  );
}

// ── Single guide card (expanded) ──────────────────────────────────────────

function GuideCard({ guide, defaultOpen }: { guide: Guide; defaultOpen?: boolean }) {
  const [, setLocation] = useLocation();
  const Icon = guide.icon;

  return (
    <div
      id={guide.id}
      className="bg-card border border-border/60 rounded-none scroll-mt-24"
    >
      {/* Header */}
      <div className="p-5 border-b border-border/40">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 border border-primary/30 flex items-center justify-center flex-shrink-0">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h2
                className="text-lg font-bold text-foreground"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                {guide.title}
              </h2>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-[10px] gap-1 text-muted-foreground hover:text-primary"
                onClick={() => setLocation(guide.path)}
              >
                Go to page <ExternalLink className="h-3 w-3" />
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">{guide.tagline}</p>
          </div>
        </div>
      </div>

      {/* Sections as accordion */}
      <Accordion
        type="multiple"
        defaultValue={defaultOpen ? guide.sections.map((_, i) => `${guide.id}-${i}`) : []}
        className="px-5 pb-3"
      >
        {guide.sections.map((section, i) => (
          <AccordionItem
            key={i}
            value={`${guide.id}-${i}`}
            className="border-border/30"
          >
            <AccordionTrigger className="text-sm font-semibold text-foreground hover:text-primary py-3">
              {section.heading}
            </AccordionTrigger>
            <AccordionContent className="pb-4">
              <GuideSectionBlock section={section} index={i} />
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}

// ── Table of contents ─────────────────────────────────────────────────────

function TableOfContents({
  guides,
  activeId,
}: {
  guides: Guide[];
  activeId: string | null;
}) {
  return (
    <div className="space-y-1">
      <p
        className="text-[10px] font-semibold tracking-[0.18em] uppercase text-muted-foreground mb-3 px-2"
        style={{ fontFamily: "var(--font-condensed)" }}
      >
        Jump to
      </p>
      {guides.map((guide) => {
        const Icon = guide.icon;
        const isActive = activeId === guide.id;
        return (
          <a
            key={guide.id}
            href={`#${guide.id}`}
            className={`flex items-center gap-2 px-2 py-1.5 rounded-sm text-xs transition-colors ${
              isActive
                ? "bg-primary/10 text-primary font-medium"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
            }`}
          >
            <Icon className="h-3.5 w-3.5 flex-shrink-0" />
            <span className="truncate">{guide.title}</span>
          </a>
        );
      })}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────

export default function Guides() {
  const [search, setSearch] = useState("");
  const [activeId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (!search.trim()) return GUIDES;
    const q = search.toLowerCase();
    return GUIDES.filter((g) => {
      if (g.title.toLowerCase().includes(q)) return true;
      if (g.tagline.toLowerCase().includes(q)) return true;
      return g.sections.some(
        (s) =>
          s.heading.toLowerCase().includes(q) ||
          s.body?.toLowerCase().includes(q) ||
          s.steps?.some(
            (st) =>
              st.action.toLowerCase().includes(q) ||
              st.detail?.toLowerCase().includes(q)
          ) ||
          s.tips?.some((t) => t.toLowerCase().includes(q)) ||
          s.warning?.toLowerCase().includes(q)
      );
    });
  }, [search]);

  return (
    <DashboardLayout>
      <div className="flex flex-col h-full">
        {/* Page header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            <h1
              className="text-2xl font-bold text-foreground"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              System Guide
            </h1>
            <Badge variant="outline" className="text-[10px] tracking-wider uppercase font-semibold">
              {GUIDES.length} Topics
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Everything you need to know about every tool. No fluff. Search or scroll.
          </p>
        </div>

        <div className="flex gap-6 flex-1 min-h-0">
          {/* Sidebar TOC — desktop only */}
          <div className="hidden lg:block w-48 flex-shrink-0">
            <div className="sticky top-4 space-y-4">
              <TableOfContents guides={filtered} activeId={activeId} />
            </div>
          </div>

          {/* Main content */}
          <div className="flex-1 min-w-0 space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search guides… (e.g. weather, invoice, voice memo)"
                className="pl-9 pr-9 bg-card border-border/60"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Results count when searching */}
            {search && (
              <p className="text-xs text-muted-foreground">
                {filtered.length === 0
                  ? "No guides match your search."
                  : `${filtered.length} guide${filtered.length !== 1 ? "s" : ""} found`}
              </p>
            )}

            {/* Guide cards */}
            <div className="space-y-4 pb-12">
              {filtered.map((guide) => (
                <GuideCard
                  key={guide.id}
                  guide={guide}
                  defaultOpen={!!search}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
