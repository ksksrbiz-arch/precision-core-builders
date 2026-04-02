/**
 * GuideHelpButton — Small help icon that shows a guide topic inline.
 * Drop this into any admin page header to give contextual help.
 */
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertTriangle,
  ChevronRight,
  HelpCircle,
  Lightbulb,
} from "lucide-react";
import { useLocation } from "wouter";
import {
  getGuideById,
  type Guide,
  type GuideSection,
} from "../pages/admin/guides-data";

function SectionBlock({ section }: { section: GuideSection }) {
  return (
    <div className="space-y-2.5">
      {section.body && (
        <p className="text-xs text-foreground/75 leading-relaxed">
          {section.body}
        </p>
      )}
      {section.steps && (
        <div className="space-y-0.5">
          {section.steps.map((step, i) => (
            <div
              key={i}
              className="flex gap-2 py-1.5 px-2 rounded hover:bg-muted/30"
            >
              <span className="text-[10px] font-bold text-primary bg-primary/10 h-5 w-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                {i + 1}
              </span>
              <div>
                <p className="text-xs font-semibold">{step.action}</p>
                {step.detail && (
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    {step.detail}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      {section.tips && (
        <div className="bg-amber-500/5 border border-amber-500/15 rounded p-2.5 space-y-1.5">
          <div className="flex items-center gap-1 text-amber-500">
            <Lightbulb className="h-3 w-3" />
            <span className="text-[10px] font-bold uppercase tracking-wider">
              Tips
            </span>
          </div>
          {section.tips.map((tip, i) => (
            <div key={i} className="flex gap-1.5 items-start">
              <ChevronRight className="h-2.5 w-2.5 text-amber-500/50 mt-1 flex-shrink-0" />
              <p className="text-[11px] text-foreground/65 leading-relaxed">
                {tip}
              </p>
            </div>
          ))}
        </div>
      )}
      {section.warning && (
        <div className="bg-red-500/5 border border-red-500/15 rounded p-2.5 flex gap-2 items-start">
          <AlertTriangle className="h-3.5 w-3.5 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-[11px] text-red-400/80 leading-relaxed font-medium">
            {section.warning}
          </p>
        </div>
      )}
    </div>
  );
}

export function GuideHelpButton({ guideId }: { guideId: string }) {
  const [, setLocation] = useLocation();
  const guide = getGuideById(guideId);

  if (!guide) return null;

  const Icon = guide.icon;

  return (
    <Sheet>
      <Tooltip>
        <TooltipTrigger asChild>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-muted-foreground hover:text-primary"
            >
              <HelpCircle className="h-4 w-4" />
            </Button>
          </SheetTrigger>
        </TooltipTrigger>
        <TooltipContent side="bottom">How to use {guide.title}</TooltipContent>
      </Tooltip>

      <SheetContent
        side="right"
        className="w-[380px] sm:w-[420px] overflow-y-auto"
      >
        <SheetHeader className="pb-4 border-b border-border/40">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 border border-primary/30 flex items-center justify-center">
              <Icon className="h-4 w-4 text-primary" />
            </div>
            <div>
              <SheetTitle className="text-base">{guide.title} Guide</SheetTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                {guide.tagline}
              </p>
            </div>
          </div>
        </SheetHeader>

        <div className="py-4">
          <Accordion
            type="multiple"
            defaultValue={guide.sections.map((_, i) => `sh-${i}`)}
          >
            {guide.sections.map((section, i) => (
              <AccordionItem
                key={i}
                value={`sh-${i}`}
                className="border-border/25"
              >
                <AccordionTrigger className="text-xs font-semibold py-2.5 hover:text-primary">
                  {section.heading}
                </AccordionTrigger>
                <AccordionContent className="pb-3">
                  <SectionBlock section={section} />
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>

        <div className="pt-3 border-t border-border/40">
          <Button
            variant="outline"
            size="sm"
            className="w-full text-xs gap-1.5"
            onClick={() => setLocation("/admin/guides")}
          >
            View All Guides
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
