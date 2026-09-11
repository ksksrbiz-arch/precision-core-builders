/**
 * Training — the guided "first week" track.
 *
 * The System Guide answers "how does this screen work?". This answers
 * "what should I do first?" — an ordered set of short, hands-on modules with
 * checkoffs, so a sit-down session has a shape and can be picked back up
 * alone the next morning.
 *
 * Progress lives in localStorage (see `lib/trainingProgress`) so it survives
 * a closed tab and works with no signal.
 */
import DashboardLayout from "@/components/DashboardLayout";
import { AdminPageHeader } from "@/components/AdminPageHeader";
import { GuideVideo } from "@/components/GuideVideo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { getGuideById } from "@/pages/admin/guides-data";
import {
  TOTAL_TRAINING_STEPS,
  TRAINING_MODULES,
  modulesByDay,
  totalTrainingMinutes,
  type TrainingModule,
} from "@/pages/admin/training-data";
import {
  clearProgress,
  loadProgress,
  saveProgress,
  stepKey,
  toggleModule,
  toggleStep,
  type TrainingProgress,
} from "@/lib/trainingProgress";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock,
  RotateCcw,
} from "lucide-react";
import { useCallback, useEffect, useId, useState } from "react";
import { useLocation } from "wouter";

/**
 * One lesson: objective, walkthrough, checkable steps, and the jump into the
 * screen it teaches. Progress is owned by the page so the header total stays
 * in sync — this component holds no state of its own.
 */
function ModuleCard({
  module,
  progress,
  onToggleStep,
  onToggleModule,
}: {
  module: TrainingModule;
  progress: TrainingProgress;
  onToggleStep: (key: string) => void;
  onToggleModule: (moduleId: string) => void;
}) {
  const [, setLocation] = useLocation();
  const headingId = useId();
  const guide = getGuideById(module.guideId);
  const done = progress.completedModules.includes(module.id);
  const doneSteps = module.steps.filter((_, i) =>
    progress.completedSteps.includes(stepKey(module.id, i))
  ).length;

  return (
    <section
      aria-labelledby={headingId}
      className={`border bg-card transition-colors ${
        done ? "border-primary/40" : "border-border/60"
      }`}
    >
      <div className="p-4 sm:p-5 border-b border-border/40">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h3
                id={headingId}
                className="text-base font-bold text-foreground"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                {module.title}
              </h3>
              {done && (
                <Badge className="text-[10px] uppercase tracking-wider gap-1">
                  <CheckCircle2 className="h-3 w-3" /> Done
                </Badge>
              )}
              <Badge
                variant="outline"
                className="text-[10px] uppercase tracking-wider gap-1"
              >
                <Clock className="h-3 w-3" />
                {module.minutes} min
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {module.objective}
            </p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <Button
              size="sm"
              variant="outline"
              className="text-xs gap-1.5"
              onClick={() => setLocation(module.path)}
            >
              Open the screen <ArrowRight className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-5 space-y-4">
        <GuideVideo
          guideId={module.guideId}
          guideTitle={guide?.title ?? module.title}
          showPending
        />

        <ul className="space-y-1">
          {module.steps.map((step, i) => {
            const key = stepKey(module.id, i);
            const checked = progress.completedSteps.includes(key);
            return (
              <li key={key} className="flex gap-3 py-2 px-2 rounded-sm">
                <Checkbox
                  id={key}
                  checked={checked}
                  onCheckedChange={() => onToggleStep(key)}
                  className="mt-0.5 flex-shrink-0"
                />
                <div className="min-w-0">
                  <label
                    htmlFor={key}
                    className={`text-sm font-semibold cursor-pointer ${
                      checked
                        ? "text-muted-foreground line-through"
                        : "text-foreground"
                    }`}
                  >
                    {step.action}
                  </label>
                  {step.detail && (
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                      {step.detail}
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>

        <div className="flex items-center justify-between gap-3 flex-wrap pt-1">
          <p className="text-[11px] text-muted-foreground">
            {doneSteps} of {module.steps.length} steps checked off
          </p>
          <div className="flex gap-2">
            {guide && (
              <Button
                size="sm"
                variant="ghost"
                className="text-xs gap-1.5 text-muted-foreground"
                onClick={() => setLocation(`/admin/guides#${guide.id}`)}
              >
                <BookOpen className="h-3 w-3" /> Read the full guide
              </Button>
            )}
            <Button
              size="sm"
              variant={done ? "outline" : "default"}
              className="text-xs"
              onClick={() => onToggleModule(module.id)}
            >
              {done ? "Mark not done" : "Mark this lesson done"}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * The guided first-week track. Owns progress state, mirrors every change to
 * localStorage, and groups the curriculum by day.
 */
/**
 * Every step key and module id the current curriculum defines. Persisted
 * progress is filtered against these so entries left by an earlier
 * curriculum can't inflate the totals.
 */
const CURRENT_KEYS = {
  stepKeys: new Set(
    TRAINING_MODULES.flatMap(m => m.steps.map((_, i) => stepKey(m.id, i)))
  ),
  moduleIds: new Set(TRAINING_MODULES.map(m => m.id)),
};

export default function Training() {
  const [progress, setProgress] = useState<TrainingProgress>(() =>
    loadProgress(CURRENT_KEYS)
  );

  useEffect(() => {
    saveProgress(progress);
  }, [progress]);

  const handleToggleStep = useCallback((key: string) => {
    setProgress(p => toggleStep(p, key));
  }, []);

  const handleToggleModule = useCallback((moduleId: string) => {
    setProgress(p => toggleModule(p, moduleId));
  }, []);

  const handleReset = useCallback(() => {
    clearProgress();
    setProgress({ completedSteps: [], completedModules: [] });
  }, []);

  const completed = progress.completedSteps.length;
  const percent =
    TOTAL_TRAINING_STEPS === 0
      ? 0
      : Math.round((completed / TOTAL_TRAINING_STEPS) * 100);
  const days = modulesByDay();

  return (
    <DashboardLayout>
      <AdminPageHeader
        title="First Week Training"
        eyebrow="Get Started"
        description="Eleven short lessons, one day at a time. Do them on real jobs — by Friday you'll be running the business on this thing. Your progress is saved on this device."
        actions={
          <Button
            variant="outline"
            size="sm"
            className="text-xs gap-1.5"
            onClick={handleReset}
          >
            <RotateCcw className="h-3 w-3" /> Start over
          </Button>
        }
      />

      <div className="border border-border/60 bg-card p-4 sm:p-5 mb-6">
        <div className="flex items-center justify-between gap-3 mb-2 flex-wrap">
          <p className="text-sm font-semibold">
            {completed} of {TOTAL_TRAINING_STEPS} steps complete
          </p>
          <p className="text-xs text-muted-foreground">
            About {totalTrainingMinutes()} minutes of hands-on time, total
          </p>
        </div>
        <Progress
          value={percent}
          aria-label={`Training progress: ${percent}% complete`}
        />
      </div>

      <div className="space-y-8 pb-12">
        {days.map(({ day, label, modules }) => (
          <div key={day} className="space-y-3">
            <h2
              className="text-sm font-bold tracking-[0.14em] uppercase text-primary"
              style={{ fontFamily: "var(--font-condensed)" }}
            >
              {label}
            </h2>
            {modules.map(module => (
              <ModuleCard
                key={module.id}
                module={module}
                progress={progress}
                onToggleStep={handleToggleStep}
                onToggleModule={handleToggleModule}
              />
            ))}
          </div>
        ))}
      </div>
    </DashboardLayout>
  );
}
