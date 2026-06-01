import { GuideHelpButton } from "@/components/GuideHelpButton";
import { ReactNode } from "react";

type AdminPageHeaderProps = {
  title: string;
  guideId?: string;
  description?: string;
  eyebrow?: string;
  actions?: ReactNode;
};

export function AdminPageHeader({
  title,
  guideId,
  description,
  eyebrow = "Admin Workspace",
  actions,
}: AdminPageHeaderProps) {
  return (
    <header className="border border-border/60 bg-gradient-to-b from-card to-card/70 p-4 sm:p-5 md:p-6 mb-4 sm:mb-6">
      <div className="flex flex-wrap items-start justify-between gap-3 sm:gap-4 md:gap-5">
        <div className="min-w-0 flex-1">
          <p
            className="text-[10px] font-bold tracking-[0.18em] uppercase text-primary mb-1.5"
            style={{ fontFamily: "var(--font-condensed)" }}
          >
            {eyebrow}
          </p>
          <div className="flex items-start gap-2 min-w-0">
            <h1
              className="text-xl sm:text-2xl md:text-3xl font-semibold leading-tight break-words min-w-0"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              {title}
            </h1>
            {guideId && (
              <span className="flex-shrink-0 mt-0.5">
                <GuideHelpButton guideId={guideId} />
              </span>
            )}
          </div>
          {description && (
            <p className="text-xs sm:text-sm md:text-base text-muted-foreground font-light mt-1 max-w-3xl">
              {description}
            </p>
          )}
        </div>
        {actions && (
          <div className="flex flex-wrap gap-2 w-full sm:w-auto [&_button]:min-h-11 [&_a]:min-h-11">
            {actions}
          </div>
        )}
      </div>
    </header>
  );
}
