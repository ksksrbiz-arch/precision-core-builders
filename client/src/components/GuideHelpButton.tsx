/**
 * GuideHelpButton — Small help icon that shows a guide topic inline.
 * Drop this into any admin page header to give contextual help.
 */
import {
  GuideSheetContent,
  GuideSheetFooterButton,
} from "@/components/GuideSheetContent";
import { Button } from "@/components/ui/button";
import { Sheet, SheetTrigger } from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { HelpCircle } from "lucide-react";
import { useLocation } from "wouter";
import { getGuideById } from "../pages/admin/guides-data";

export function GuideHelpButton({ guideId }: { guideId: string }) {
  const [, setLocation] = useLocation();
  const guide = getGuideById(guideId);

  if (!guide) return null;

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

      <GuideSheetContent
        guide={guide}
        footer={
          <GuideSheetFooterButton onClick={() => setLocation("/admin/guides")}>
            View All Guides
          </GuideSheetFooterButton>
        }
      />
    </Sheet>
  );
}
