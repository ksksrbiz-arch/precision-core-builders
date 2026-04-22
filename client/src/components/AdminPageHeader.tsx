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
    <header className="border border-border/60 bg-gradient-to-b from-card to-card/70 p-4 sm:p-5 mb-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p
            className="text-[10px] font-bold tracking-[0.18em] uppercase text-primary mb-1.5"
            style={{ fontFamily: "var(--font-condensed)" }}
          >
            {eyebrow}
          </p>
          <div className="flex items-center gap-2">
            <h1
              className="text-2xl font-semibold"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              {title}
            </h1>
            {guideId && <GuideHelpButton guideId={guideId} />}
          </div>
          {description && (
            <p className="text-sm text-muted-foreground font-light mt-1">
              {description}
            </p>
          )}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
    </header>
  );
}
