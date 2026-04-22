import { GuideSheetContent } from "@/components/GuideSheetContent";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Sheet } from "@/components/ui/sheet";
import { getGuideByPath } from "@/pages/admin/guides-data";
import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";

const GUIDE_SEEN_KEY = "pcb-admin-guide-seen";
const GUIDE_MUTED_KEY = "pcb-admin-guide-muted";

function readGuideStorage(key: string) {
  if (typeof window === "undefined") return {} as Record<string, boolean>;

  try {
    return JSON.parse(window.localStorage.getItem(key) ?? "{}") as Record<
      string,
      boolean
    >;
  } catch {
    return {};
  }
}

function writeGuideStorage(key: string, value: Record<string, boolean>) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

export function AdminGuidePrompt() {
  const [location, setLocation] = useLocation();
  const [open, setOpen] = useState(false);
  const [silencePrompt, setSilencePrompt] = useState(false);

  const guide = useMemo(() => getGuideByPath(location), [location]);

  useEffect(() => {
    if (
      !guide ||
      !location.startsWith("/admin") ||
      location === "/admin/guides"
    ) {
      setOpen(false);
      setSilencePrompt(false);
      return;
    }

    const muted = readGuideStorage(GUIDE_MUTED_KEY);
    const seen = readGuideStorage(GUIDE_SEEN_KEY);
    if (muted[guide.id] || seen[location]) {
      setOpen(false);
      setSilencePrompt(false);
      return;
    }

    writeGuideStorage(GUIDE_SEEN_KEY, { ...seen, [location]: true });
    setSilencePrompt(false);
    setOpen(true);
  }, [guide, location]);

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);

    if (!nextOpen && guide && silencePrompt) {
      const muted = readGuideStorage(GUIDE_MUTED_KEY);
      writeGuideStorage(GUIDE_MUTED_KEY, {
        ...muted,
        [guide.id]: true,
      });
    }
  };

  if (!guide || location === "/admin/guides") return null;

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <GuideSheetContent
        guide={guide}
        footer={
          <>
            <label className="flex items-start gap-2 text-xs text-muted-foreground">
              <Checkbox
                checked={silencePrompt}
                onCheckedChange={checked => setSilencePrompt(checked === true)}
                className="mt-0.5"
              />
              <span>
                Don&apos;t auto-open this guide again for {guide.title}.
              </span>
            </label>

            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs"
                onClick={() => setLocation(`/admin/guides#${guide.id}`)}
              >
                Open Guide Hub
              </Button>
              <Button
                size="sm"
                className="w-full text-xs bg-primary hover:bg-primary/85"
                onClick={() => handleOpenChange(false)}
              >
                Continue to {guide.title}
              </Button>
            </div>
          </>
        }
      />
    </Sheet>
  );
}
