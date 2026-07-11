/**
 * OnboardingWizard — Guided setup for Eric's ownership transfer.
 *
 * URL: /onboarding            (manual token entry)
 *      /onboarding?token=XYZ  (preload token via URL)
 *
 * Token validation: ONBOARDING_TOKEN env var on Netlify.
 * Storage: sessionStorage (progress), NOT localStorage (tokens expire with tab).
 * Security: Token never persisted to localStorage. Verified server-side on every
 *           provision/verify call via timing-safe comparison.
 */
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  CloudRain,
  CreditCard,
  Database,
  ExternalLink,
  Github,
  KeyRound,
  Loader2,
  PartyPopper,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useId,
  useReducer,
  useState,
  type ComponentType,
} from "react";

// ─── Types ──────────────────────────────────────────────────────────

type PhaseId =
  | "welcome"
  | "github"
  | "netlify"
  | "supabase"
  | "ai"
  | "weather"
  | "stripe"
  | "complete";

type PhaseStatus = "pending" | "verified" | "skipped";

interface PhaseState {
  status: PhaseStatus;
  data?: Record<string, string>;
  verifiedAt?: string;
}

interface WizardState {
  token: string;
  currentPhase: PhaseId;
  phases: Record<PhaseId, PhaseState>;
}

type WizardAction =
  | { type: "SET_TOKEN"; token: string }
  | { type: "CLEAR_TOKEN" }
  | { type: "GOTO_PHASE"; phase: PhaseId }
  | { type: "UPDATE_PHASE"; phase: PhaseId; update: Partial<PhaseState> }
  | { type: "RESET" };

const PROGRESS_KEY = "pcb-onboarding-progress";
const TOKEN_KEY = "pcb-onboarding-token"; // sessionStorage only

export const PHASE_ORDER: PhaseId[] = [
  "welcome",
  "github",
  "netlify",
  "supabase",
  "ai",
  "weather",
  "stripe",
  "complete",
];

const PHASE_META: Record<
  PhaseId,
  { title: string; icon: ComponentType<{ className?: string }> }
> = {
  welcome: { title: "Start", icon: Sparkles },
  github: { title: "GitHub", icon: Github },
  netlify: { title: "Netlify", icon: ShieldCheck },
  supabase: { title: "Database", icon: Database },
  ai: { title: "AI", icon: Sparkles },
  weather: { title: "Weather", icon: CloudRain },
  stripe: { title: "Payments", icon: CreditCard },
  complete: { title: "Finish", icon: PartyPopper },
};

// ─── Reducer + state (exported for testing) ─────────────────────────

export function initialState(): WizardState {
  return {
    token: "",
    currentPhase: "welcome",
    phases: Object.fromEntries(
      PHASE_ORDER.map(p => [p, { status: "pending" as PhaseStatus }])
    ) as Record<PhaseId, PhaseState>,
  };
}

export function reducer(state: WizardState, action: WizardAction): WizardState {
  switch (action.type) {
    case "SET_TOKEN":
      return { ...state, token: action.token };
    case "CLEAR_TOKEN":
      return { ...state, token: "" };
    case "GOTO_PHASE":
      return { ...state, currentPhase: action.phase };
    case "UPDATE_PHASE":
      return {
        ...state,
        phases: {
          ...state.phases,
          [action.phase]: { ...state.phases[action.phase], ...action.update },
        },
      };
    case "RESET":
      return initialState();
  }
}

function loadPersistedState(): WizardState {
  if (typeof window === "undefined") return initialState();
  try {
    const raw = sessionStorage.getItem(PROGRESS_KEY);
    const token = sessionStorage.getItem(TOKEN_KEY) ?? "";
    if (raw) {
      const parsed = JSON.parse(raw) as Omit<WizardState, "token">;
      if (parsed.currentPhase && parsed.phases) {
        return { ...parsed, token };
      }
    }
  } catch {
    /* ignore — start fresh */
  }
  const fresh = initialState();
  return {
    ...fresh,
    token:
      typeof window !== "undefined"
        ? (sessionStorage.getItem(TOKEN_KEY) ?? "")
        : "",
  };
}

function usePersistedWizard() {
  const [state, dispatch] = useReducer(reducer, undefined, loadPersistedState);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const { token: _ignore, ...rest } = state;
      void _ignore;
      sessionStorage.setItem(PROGRESS_KEY, JSON.stringify(rest));
    } catch {
      /* quota exceeded — ignore */
    }
  }, [state]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (state.token) {
      sessionStorage.setItem(TOKEN_KEY, state.token);
    } else {
      sessionStorage.removeItem(TOKEN_KEY);
    }
  }, [state.token]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const urlToken = params.get("token");
    if (urlToken && !state.token) {
      dispatch({ type: "SET_TOKEN", token: urlToken });
      // Strip from URL to avoid lingering in history/logs
      const url = new URL(window.location.href);
      url.searchParams.delete("token");
      window.history.replaceState({}, "", url.toString());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return [state, dispatch] as const;
}

// ─── API helpers ────────────────────────────────────────────────────

interface VerifyResult {
  ok: boolean;
  message: string;
  service?: string;
}

interface ProvisionResult {
  ok: boolean;
  written?: string[];
  failed?: Array<{ key: string; error: string }>;
  deployId?: string;
  error?: string;
}

async function verifyService(
  token: string,
  service: string,
  credentials: Record<string, string>
): Promise<VerifyResult> {
  try {
    const res = await fetch("/.netlify/functions/onboarding-verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ onboardingToken: token, service, credentials }),
    });
    const data = (await res.json()) as VerifyResult & { error?: string };
    if (!res.ok) {
      return {
        ok: false,
        message: data.error ?? `Server returned ${res.status}`,
      };
    }
    return data;
  } catch (err) {
    return {
      ok: false,
      message:
        err instanceof Error ? err.message : "Network error — check connection",
    };
  }
}

async function provisionPhase(
  token: string,
  phase: string,
  vars: Record<string, string>,
  triggerDeploy = false
): Promise<ProvisionResult> {
  try {
    const res = await fetch("/.netlify/functions/onboarding-provision", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        onboardingToken: token,
        phase,
        vars,
        triggerDeploy,
      }),
    });
    const data = (await res.json()) as ProvisionResult;
    return { ...data, ok: res.ok && data.ok !== false };
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof Error ? err.message : "Network error — check connection",
    };
  }
}

// ─── Shared primitives ──────────────────────────────────────────────

function NumberedStep({
  n,
  children,
}: {
  n: number;
  children: React.ReactNode;
}) {
  return (
    <li className="flex gap-3">
      <span
        aria-hidden="true"
        className="w-6 h-6 rounded-full bg-[#C8A84B]/20 text-[#C8A84B] flex items-center justify-center text-xs font-bold shrink-0 mt-0.5"
      >
        {n}
      </span>
      <div className="text-sm text-neutral-300 leading-relaxed">{children}</div>
    </li>
  );
}

function ExternalLinkButton({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => window.open(href, "_blank", "noopener,noreferrer")}
      className="border-neutral-700 hover:border-[#C8A84B] hover:text-[#C8A84B]"
    >
      <ExternalLink className="w-3.5 h-3.5 mr-1.5" aria-hidden="true" />
      {children}
    </Button>
  );
}

// ─── Main component ─────────────────────────────────────────────────

export default function OnboardingWizard() {
  const [state, dispatch] = usePersistedWizard();

  const currentIndex = PHASE_ORDER.indexOf(state.currentPhase);
  const progressPct = Math.round(
    ((currentIndex + 1) / PHASE_ORDER.length) * 100
  );

  const goNext = useCallback(() => {
    const next = PHASE_ORDER[currentIndex + 1];
    if (next) dispatch({ type: "GOTO_PHASE", phase: next });
  }, [currentIndex]);

  const goBack = useCallback(() => {
    const prev = PHASE_ORDER[currentIndex - 1];
    if (prev) dispatch({ type: "GOTO_PHASE", phase: prev });
  }, [currentIndex]);

  const gotoPhase = useCallback((phase: PhaseId) => {
    dispatch({ type: "GOTO_PHASE", phase });
  }, []);

  const updatePhase = useCallback(
    (phase: PhaseId, update: Partial<PhaseState>) => {
      dispatch({ type: "UPDATE_PHASE", phase, update });
    },
    []
  );

  return (
    <div
      className="min-h-screen bg-neutral-950 text-neutral-100"
      style={{
        backgroundImage:
          "radial-gradient(circle at top left, rgba(200,168,75,0.08), transparent 50%), radial-gradient(circle at bottom right, rgba(139,115,85,0.06), transparent 50%)",
      }}
    >
      <Header
        currentIndex={currentIndex}
        progressPct={progressPct}
        totalPhases={PHASE_ORDER.length}
      />
      <Stepper
        currentPhase={state.currentPhase}
        phases={state.phases}
        currentIndex={currentIndex}
        onNavigate={gotoPhase}
      />

      <main className="max-w-3xl mx-auto px-4 md:px-6 pb-24" aria-live="polite">
        {state.currentPhase === "welcome" && (
          <WelcomePhase
            token={state.token}
            onTokenChange={t => dispatch({ type: "SET_TOKEN", token: t })}
            onContinue={goNext}
          />
        )}
        {state.currentPhase === "github" && (
          <GitHubPhase
            phaseState={state.phases.github}
            onUpdate={u => updatePhase("github", u)}
            onNext={goNext}
            onBack={goBack}
          />
        )}
        {state.currentPhase === "netlify" && (
          <NetlifyPhase
            phaseState={state.phases.netlify}
            onUpdate={u => updatePhase("netlify", u)}
            onNext={goNext}
            onBack={goBack}
          />
        )}
        {state.currentPhase === "supabase" && (
          <SupabasePhase
            phaseState={state.phases.supabase}
            onUpdate={u => updatePhase("supabase", u)}
            onNext={goNext}
            onBack={goBack}
          />
        )}
        {state.currentPhase === "ai" && (
          <AIPhase
            token={state.token}
            phaseState={state.phases.ai}
            onUpdate={u => updatePhase("ai", u)}
            onNext={goNext}
            onBack={goBack}
          />
        )}
        {state.currentPhase === "weather" && (
          <WeatherPhase
            token={state.token}
            phaseState={state.phases.weather}
            onUpdate={u => updatePhase("weather", u)}
            onNext={goNext}
            onBack={goBack}
          />
        )}
        {state.currentPhase === "stripe" && (
          <StripePhase
            token={state.token}
            phaseState={state.phases.stripe}
            onUpdate={u => updatePhase("stripe", u)}
            onNext={goNext}
            onBack={goBack}
          />
        )}
        {state.currentPhase === "complete" && (
          <CompletePhase
            token={state.token}
            phases={state.phases}
            onBack={goBack}
            onReset={() => dispatch({ type: "RESET" })}
          />
        )}
      </main>
    </div>
  );
}

// ─── Header & Stepper ───────────────────────────────────────────────

function Header({
  currentIndex,
  progressPct,
  totalPhases,
}: {
  currentIndex: number;
  progressPct: number;
  totalPhases: number;
}) {
  return (
    <header className="border-b border-neutral-800 bg-neutral-950/80 backdrop-blur sticky top-0 z-10">
      <div className="max-w-4xl mx-auto px-4 md:px-6 py-4 flex items-center justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-[0.25em] text-[#C8A84B] font-medium">
            Precision Core Builders
          </div>
          <div className="text-base md:text-lg font-semibold">
            Platform Setup
          </div>
        </div>
        <Badge
          variant="outline"
          className="border-[#C8A84B] text-[#C8A84B]"
          aria-label={`Step ${currentIndex + 1} of ${totalPhases}`}
        >
          {currentIndex + 1} of {totalPhases}
        </Badge>
      </div>
      <Progress
        value={progressPct}
        className="rounded-none h-1 bg-neutral-800"
        aria-label={`${progressPct}% complete`}
      />
    </header>
  );
}

function Stepper({
  currentPhase,
  phases,
  currentIndex,
  onNavigate,
}: {
  currentPhase: PhaseId;
  phases: Record<PhaseId, PhaseState>;
  currentIndex: number;
  onNavigate: (phase: PhaseId) => void;
}) {
  return (
    <nav
      aria-label="Setup progress"
      className="max-w-4xl mx-auto px-4 md:px-6 py-6 hidden md:flex items-center justify-between gap-2 overflow-x-auto"
    >
      {PHASE_ORDER.map((phase, i) => {
        const Meta = PHASE_META[phase];
        const Icon = Meta.icon;
        const phaseState = phases[phase];
        const active = phase === currentPhase;
        const done =
          phaseState.status === "verified" ||
          phaseState.status === "skipped" ||
          i < currentIndex;
        return (
          <button
            key={phase}
            onClick={() => onNavigate(phase)}
            aria-current={active ? "step" : undefined}
            className={`flex items-center gap-2 px-3 py-2 rounded-md text-xs whitespace-nowrap transition focus:outline-none focus:ring-2 focus:ring-[#C8A84B] ${
              active
                ? "bg-[#C8A84B] text-neutral-950 font-semibold"
                : done
                  ? "bg-neutral-800 text-neutral-300 hover:bg-neutral-700"
                  : "text-neutral-500 hover:text-neutral-300"
            }`}
          >
            {done && !active ? (
              <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
            ) : (
              <Icon className="w-3.5 h-3.5" aria-hidden="true" />
            )}
            {Meta.title}
          </button>
        );
      })}
    </nav>
  );
}

// ─── Phase: Welcome ─────────────────────────────────────────────────

function WelcomePhase({
  token,
  onTokenChange,
  onContinue,
}: {
  token: string;
  onTokenChange: (t: string) => void;
  onContinue: () => void;
}) {
  const tokenId = useId();
  return (
    <Card className="bg-neutral-900 border-neutral-800 mt-4">
      <CardHeader>
        <div className="w-14 h-14 rounded-full bg-[#C8A84B]/10 flex items-center justify-center mb-3">
          <Sparkles className="w-7 h-7 text-[#C8A84B]" aria-hidden="true" />
        </div>
        <CardTitle className="text-2xl">Welcome, Eric.</CardTitle>
        <CardDescription className="text-neutral-400 text-base leading-relaxed">
          One-time setup for your Digital Foreman platform. About 20 minutes.
          Your progress saves automatically — close this tab any time and come
          back.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="bg-neutral-800/50 rounded-md p-4 border border-neutral-700">
          <div className="text-sm text-neutral-300 font-medium mb-3">
            What you'll do:
          </div>
          <ol className="space-y-2 text-sm text-neutral-400">
            <li>
              <span className="text-[#C8A84B] mr-2">01</span>Create free
              accounts with GitHub, Netlify, and Supabase.
            </li>
            <li>
              <span className="text-[#C8A84B] mr-2">02</span>Grab API keys from
              two AI services — each one verified live before saving.
            </li>
            <li>
              <span className="text-[#C8A84B] mr-2">03</span>Grant Keith
              backstop access so domain and hosting keep running.
            </li>
            <li>
              <span className="text-[#C8A84B] mr-2">04</span>Skip Stripe for now
              if online payments aren't needed yet.
            </li>
          </ol>
        </div>

        <div>
          <Label htmlFor={tokenId} className="text-neutral-200">
            Setup Token
          </Label>
          <Input
            id={tokenId}
            type="password"
            value={token}
            onChange={e => onTokenChange(e.target.value)}
            placeholder="Paste the code Keith texted you"
            autoComplete="off"
            spellCheck={false}
            className="mt-2 bg-neutral-950 border-neutral-700 text-neutral-100 font-mono"
          />
          <p className="text-xs text-neutral-500 mt-1.5">
            Keith sent this to your phone. It's how we know it's you.
          </p>
        </div>
      </CardContent>
      <CardFooter>
        <Button
          disabled={!token.trim()}
          onClick={onContinue}
          className="bg-[#C8A84B] text-neutral-950 hover:bg-[#d4b65a] ml-auto"
          size="lg"
        >
          Let's Go
          <ArrowRight className="ml-2 w-4 h-4" aria-hidden="true" />
        </Button>
      </CardFooter>
    </Card>
  );
}

// ─── Phase: GitHub ──────────────────────────────────────────────────

function GitHubPhase({
  phaseState,
  onUpdate,
  onNext,
  onBack,
}: {
  phaseState: PhaseState;
  onUpdate: (u: Partial<PhaseState>) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const [username, setUsername] = useState(
    phaseState.data?.GITHUB_USERNAME ?? ""
  );
  const usernameId = useId();

  const isValidUsername =
    /^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?$/.test(username.trim());

  return (
    <Card className="bg-neutral-900 border-neutral-800 mt-4">
      <CardHeader>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-md bg-neutral-800 flex items-center justify-center">
            <Github className="w-5 h-5" aria-hidden="true" />
          </div>
          <Badge className="bg-neutral-800 text-neutral-400 border-0">
            Step 2 of 7
          </Badge>
        </div>
        <CardTitle className="text-xl">Set up GitHub</CardTitle>
        <CardDescription className="text-neutral-400">
          GitHub stores your platform's code. Free forever for what you need.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <ExternalLinkButton href="https://github.com/signup">
          Open GitHub Signup
        </ExternalLinkButton>

        <ol className="space-y-3">
          <NumberedStep n={1}>
            Sign up with your work email. Pick a username —{" "}
            <code className="text-[#C8A84B]">precisioncorebuilders</code> works
            well.
          </NumberedStep>
          <NumberedStep n={2}>
            When GitHub asks, turn on <strong>two-factor authentication</strong>{" "}
            with an authenticator app (Google Authenticator, Authy, 1Password).
            Not SMS.
          </NumberedStep>
          <NumberedStep n={3}>
            Come back here and enter your username below.
          </NumberedStep>
        </ol>

        <div>
          <Label htmlFor={usernameId} className="text-neutral-200">
            Your GitHub username
          </Label>
          <Input
            id={usernameId}
            value={username}
            onChange={e => setUsername(e.target.value)}
            placeholder="e.g., precisioncorebuilders"
            autoComplete="off"
            spellCheck={false}
            className="mt-1.5 bg-neutral-950 border-neutral-700 text-neutral-100"
            aria-invalid={username.length > 0 && !isValidUsername}
            aria-describedby={`${usernameId}-help`}
          />
          <p
            id={`${usernameId}-help`}
            className="text-xs text-neutral-500 mt-1.5"
          >
            {username.length > 0 && !isValidUsername
              ? "Letters, numbers, and hyphens only. Can't start or end with a hyphen."
              : "Keith uses this to transfer the repo to you."}
          </p>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button
          variant="ghost"
          onClick={onBack}
          className="text-neutral-400 hover:text-neutral-200"
        >
          <ArrowLeft className="w-4 h-4 mr-2" aria-hidden="true" />
          Back
        </Button>
        <Button
          disabled={!isValidUsername}
          onClick={() => {
            onUpdate({
              status: "verified",
              data: { GITHUB_USERNAME: username.trim() },
              verifiedAt: new Date().toISOString(),
            });
            onNext();
          }}
          className="bg-[#C8A84B] text-neutral-950 hover:bg-[#d4b65a]"
        >
          Continue
          <ArrowRight className="ml-2 w-4 h-4" aria-hidden="true" />
        </Button>
      </CardFooter>
    </Card>
  );
}

// ─── Phase: Netlify ─────────────────────────────────────────────────

function NetlifyPhase({
  phaseState,
  onUpdate,
  onNext,
  onBack,
}: {
  phaseState: PhaseState;
  onUpdate: (u: Partial<PhaseState>) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const [confirmed, setConfirmed] = useState(phaseState.status === "verified");
  const confirmId = useId();

  return (
    <Card className="bg-neutral-900 border-neutral-800 mt-4">
      <CardHeader>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-md bg-neutral-800 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-teal-400" aria-hidden="true" />
          </div>
          <Badge className="bg-neutral-800 text-neutral-400 border-0">
            Step 3 of 7
          </Badge>
        </div>
        <CardTitle className="text-xl">Set up Netlify</CardTitle>
        <CardDescription className="text-neutral-400">
          Netlify hosts your live site. Sign in with GitHub — no new password.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <ExternalLinkButton href="https://app.netlify.com/signup">
          Open Netlify Signup
        </ExternalLinkButton>

        <ol className="space-y-3">
          <NumberedStep n={1}>
            Click <strong>Sign up with GitHub</strong>. Authorize the
            connection.
          </NumberedStep>
          <NumberedStep n={2}>
            Name your team{" "}
            <code className="text-[#C8A84B]">precision-core-builders</code>.
          </NumberedStep>
          <NumberedStep n={3}>
            In the team sidebar: <strong>Members → Invite a member</strong>. Add{" "}
            <code className="text-[#C8A84B]">keith@1commercesolutions.com</code>{" "}
            as <strong>Team Owner</strong>.
          </NumberedStep>
          <NumberedStep n={4}>
            Keith migrates the site from there — nothing for you to import.
          </NumberedStep>
        </ol>

        <Alert className="bg-amber-900/20 border-amber-700/50 text-amber-200">
          <AlertCircle className="w-4 h-4" aria-hidden="true" />
          <AlertTitle>Don't create a new site</AlertTitle>
          <AlertDescription className="text-amber-200/80">
            Your site already exists. Keith moves it to your new team — no
            downtime, no URL change.
          </AlertDescription>
        </Alert>

        <label
          htmlFor={confirmId}
          className="flex items-start gap-3 cursor-pointer"
        >
          <input
            id={confirmId}
            type="checkbox"
            checked={confirmed}
            onChange={e => setConfirmed(e.target.checked)}
            className="mt-1 w-4 h-4 accent-[#C8A84B]"
          />
          <span className="text-sm text-neutral-300">
            Team is created and Keith is invited as Team Owner.
          </span>
        </label>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button
          variant="ghost"
          onClick={onBack}
          className="text-neutral-400 hover:text-neutral-200"
        >
          <ArrowLeft className="w-4 h-4 mr-2" aria-hidden="true" />
          Back
        </Button>
        <Button
          disabled={!confirmed}
          onClick={() => {
            onUpdate({
              status: "verified",
              verifiedAt: new Date().toISOString(),
            });
            onNext();
          }}
          className="bg-[#C8A84B] text-neutral-950 hover:bg-[#d4b65a]"
        >
          Continue
          <ArrowRight className="ml-2 w-4 h-4" aria-hidden="true" />
        </Button>
      </CardFooter>
    </Card>
  );
}

// ─── Phase: Supabase ────────────────────────────────────────────────

function SupabasePhase({
  phaseState,
  onUpdate,
  onNext,
  onBack,
}: {
  phaseState: PhaseState;
  onUpdate: (u: Partial<PhaseState>) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const [confirmed, setConfirmed] = useState(phaseState.status === "verified");
  const confirmId = useId();

  return (
    <Card className="bg-neutral-900 border-neutral-800 mt-4">
      <CardHeader>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-md bg-neutral-800 flex items-center justify-center">
            <Database className="w-5 h-5 text-green-400" aria-hidden="true" />
          </div>
          <Badge className="bg-neutral-800 text-neutral-400 border-0">
            Step 4 of 7
          </Badge>
        </div>
        <CardTitle className="text-xl">Set up Supabase</CardTitle>
        <CardDescription className="text-neutral-400">
          Projects, clients, and field reports live here. Already built out —
          you just need an account so Keith can transfer ownership.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <ExternalLinkButton href="https://supabase.com/dashboard/sign-up">
          Open Supabase Signup
        </ExternalLinkButton>

        <ol className="space-y-3">
          <NumberedStep n={1}>
            Sign in with the GitHub account you just made.
          </NumberedStep>
          <NumberedStep n={2}>
            Create an organization named{" "}
            <code className="text-[#C8A84B]">Precision Core Builders</code>.
          </NumberedStep>
          <NumberedStep n={3}>
            Keith transfers your project into this org. Accept the invite email
            when it lands.
          </NumberedStep>
        </ol>

        <Alert className="bg-neutral-800 border-neutral-700">
          <CheckCircle2 className="w-4 h-4 text-green-400" aria-hidden="true" />
          <AlertTitle className="text-neutral-200">Already running</AlertTitle>
          <AlertDescription className="text-neutral-400">
            Database is live, nightly backups on, data encrypted at rest.
            Nothing to configure.
          </AlertDescription>
        </Alert>

        <label
          htmlFor={confirmId}
          className="flex items-start gap-3 cursor-pointer"
        >
          <input
            id={confirmId}
            type="checkbox"
            checked={confirmed}
            onChange={e => setConfirmed(e.target.checked)}
            className="mt-1 w-4 h-4 accent-[#C8A84B]"
          />
          <span className="text-sm text-neutral-300">
            Supabase account and organization created.
          </span>
        </label>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button
          variant="ghost"
          onClick={onBack}
          className="text-neutral-400 hover:text-neutral-200"
        >
          <ArrowLeft className="w-4 h-4 mr-2" aria-hidden="true" />
          Back
        </Button>
        <Button
          disabled={!confirmed}
          onClick={() => {
            onUpdate({
              status: "verified",
              verifiedAt: new Date().toISOString(),
            });
            onNext();
          }}
          className="bg-[#C8A84B] text-neutral-950 hover:bg-[#d4b65a]"
        >
          Continue
          <ArrowRight className="ml-2 w-4 h-4" aria-hidden="true" />
        </Button>
      </CardFooter>
    </Card>
  );
}

// ─── Shared: Key collection phase ───────────────────────────────────

interface KeyField {
  key: string;
  label: string;
  placeholder: string;
  type?: string;
  optional?: boolean;
  hint?: string;
}

interface KeyCollectionProps {
  token: string;
  icon: ComponentType<{ className?: string }>;
  iconColor: string;
  stepLabel: string;
  title: string;
  description: string;
  serviceId: string;
  phaseId: string;
  accountUrl: string;
  accountUrlLabel: string;
  instructions: React.ReactNode[];
  fields: KeyField[];
  phaseState: PhaseState;
  onUpdate: (u: Partial<PhaseState>) => void;
  onNext: () => void;
  onBack: () => void;
  allowSkip?: boolean;
  skipHint?: string;
}

function KeyCollectionPhase({
  token,
  icon: Icon,
  iconColor,
  stepLabel,
  title,
  description,
  serviceId,
  phaseId,
  accountUrl,
  accountUrlLabel,
  instructions,
  fields,
  phaseState,
  onUpdate,
  onNext,
  onBack,
  allowSkip = false,
  skipHint,
}: KeyCollectionProps) {
  const [values, setValues] = useState<Record<string, string>>(
    () => phaseState.data ?? {}
  );
  const [verifyState, setVerifyState] = useState<
    "idle" | "verifying" | "ok" | "error"
  >(phaseState.status === "verified" ? "ok" : "idle");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const requiredFilled = fields.every(
    f => f.optional || (values[f.key]?.trim().length ?? 0) > 0
  );

  const handleVerify = useCallback(async () => {
    if (!token) {
      setVerifyState("error");
      setMessage("Setup token missing. Go back to step 1.");
      return;
    }
    setVerifyState("verifying");
    setMessage("");
    const result = await verifyService(token, serviceId, values);
    setVerifyState(result.ok ? "ok" : "error");
    setMessage(result.message);
  }, [token, serviceId, values]);

  const handleSaveAndContinue = useCallback(async () => {
    setSaving(true);
    const nonEmpty = Object.fromEntries(
      Object.entries(values).filter(([, v]) => v?.trim())
    );
    const result = await provisionPhase(token, phaseId, nonEmpty, false);
    setSaving(false);
    if (result.ok) {
      onUpdate({
        status: "verified",
        data: values,
        verifiedAt: new Date().toISOString(),
      });
      onNext();
    } else {
      setVerifyState("error");
      setMessage(
        result.error ??
          `Couldn't save to Netlify: ${
            result.failed?.map(f => `${f.key} (${f.error})`).join(", ") ??
            "unknown error"
          }. Contact Keith.`
      );
    }
  }, [token, phaseId, values, onUpdate, onNext]);

  const handleSkip = useCallback(() => {
    onUpdate({ status: "skipped" });
    onNext();
  }, [onUpdate, onNext]);

  return (
    <Card className="bg-neutral-900 border-neutral-800 mt-4">
      <CardHeader>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-md bg-neutral-800 flex items-center justify-center">
            <Icon className={`w-5 h-5 ${iconColor}`} aria-hidden="true" />
          </div>
          <Badge className="bg-neutral-800 text-neutral-400 border-0">
            {stepLabel}
          </Badge>
        </div>
        <CardTitle className="text-xl">{title}</CardTitle>
        <CardDescription className="text-neutral-400">
          {description}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <ExternalLinkButton href={accountUrl}>
          {accountUrlLabel}
        </ExternalLinkButton>

        <ol className="space-y-3">
          {instructions.map((inst, i) => (
            <NumberedStep key={i} n={i + 1}>
              {inst}
            </NumberedStep>
          ))}
        </ol>

        <div className="space-y-4 border-t border-neutral-800 pt-5">
          {fields.map(field => (
            <KeyInputField
              key={field.key}
              field={field}
              value={values[field.key] ?? ""}
              onChange={v => {
                setValues(prev => ({ ...prev, [field.key]: v }));
                if (verifyState === "ok") setVerifyState("idle");
              }}
            />
          ))}
        </div>

        {message && (
          <Alert
            className={
              verifyState === "ok"
                ? "bg-green-900/20 border-green-700/50"
                : "bg-red-900/20 border-red-700/50"
            }
          >
            {verifyState === "ok" ? (
              <CheckCircle2
                className="w-4 h-4 text-green-400"
                aria-hidden="true"
              />
            ) : (
              <AlertCircle
                className="w-4 h-4 text-red-400"
                aria-hidden="true"
              />
            )}
            <AlertDescription
              className={
                verifyState === "ok" ? "text-green-200" : "text-red-200"
              }
            >
              {message}
            </AlertDescription>
          </Alert>
        )}

        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            onClick={handleVerify}
            disabled={!requiredFilled || verifyState === "verifying"}
            variant="outline"
            className="border-[#C8A84B] text-[#C8A84B] hover:bg-[#C8A84B]/10 hover:text-[#C8A84B]"
          >
            {verifyState === "verifying" ? (
              <>
                <Loader2
                  className="w-4 h-4 mr-2 animate-spin"
                  aria-hidden="true"
                />
                Verifying…
              </>
            ) : (
              <>
                <KeyRound className="w-4 h-4 mr-2" aria-hidden="true" />
                Verify Key
              </>
            )}
          </Button>
          <Button
            onClick={handleSaveAndContinue}
            disabled={verifyState !== "ok" || saving}
            className="bg-[#C8A84B] text-neutral-950 hover:bg-[#d4b65a] sm:ml-auto"
          >
            {saving ? (
              <>
                <Loader2
                  className="w-4 h-4 mr-2 animate-spin"
                  aria-hidden="true"
                />
                Saving…
              </>
            ) : (
              <>
                Save & Continue
                <ArrowRight className="ml-2 w-4 h-4" aria-hidden="true" />
              </>
            )}
          </Button>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button
          variant="ghost"
          onClick={onBack}
          className="text-neutral-400 hover:text-neutral-200"
        >
          <ArrowLeft className="w-4 h-4 mr-2" aria-hidden="true" />
          Back
        </Button>
        {allowSkip && (
          <Button
            variant="ghost"
            onClick={handleSkip}
            className="text-neutral-500 hover:text-neutral-300"
            title={skipHint}
          >
            Skip for now
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}

function KeyInputField({
  field,
  value,
  onChange,
}: {
  field: KeyField;
  value: string;
  onChange: (v: string) => void;
}) {
  const id = useId();
  return (
    <div>
      <Label htmlFor={id} className="text-neutral-200">
        {field.label}{" "}
        {field.optional && (
          <span className="text-neutral-500 text-xs font-normal">
            (optional)
          </span>
        )}
      </Label>
      <Input
        id={id}
        type={field.type ?? "password"}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={field.placeholder}
        autoComplete="off"
        spellCheck={false}
        className="mt-1.5 bg-neutral-950 border-neutral-700 text-neutral-100 font-mono text-xs"
      />
      {field.hint && (
        <p className="text-xs text-neutral-500 mt-1.5">{field.hint}</p>
      )}
    </div>
  );
}

// ─── Phase: AI ──────────────────────────────────────────────────────

function AIPhase(props: {
  token: string;
  phaseState: PhaseState;
  onUpdate: (u: Partial<PhaseState>) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  return (
    <KeyCollectionPhase
      {...props}
      icon={Sparkles}
      iconColor="text-purple-400"
      stepLabel="Step 5 of 7"
      title="AI Intelligence"
      description="Powers Voice-to-Report, the AI Estimator, Vision Studio, and the chat assistant."
      serviceId="groq"
      phaseId="ai"
      accountUrl="https://console.groq.com/keys"
      accountUrlLabel="Get Groq API Key"
      instructions={[
        <>
          Sign up at Groq. Google sign-in works if you'd rather not make a
          password.
        </>,
        <>
          <strong>No credit card needed.</strong> Groq's free tier covers your
          usage.
        </>,
        <>
          Click <strong>Create API Key</strong>. Name it{" "}
          <code className="text-[#C8A84B]">precision-core-digital-foreman</code>
          . Copy it right away — Groq only shows it once.
        </>,
        <>
          Paste it below and hit <strong>Verify</strong>.
        </>,
      ]}
      fields={[
        {
          key: "GROQ_API_KEY",
          label: "Groq API Key (free)",
          placeholder: "gsk_...",
          hint: "Starts with gsk_. About 56 characters long.",
        },
      ]}
    />
  );
}

// ─── Phase: Weather ─────────────────────────────────────────────────

function WeatherPhase(props: {
  token: string;
  phaseState: PhaseState;
  onUpdate: (u: Partial<PhaseState>) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  return (
    <KeyCollectionPhase
      {...props}
      icon={CloudRain}
      iconColor="text-blue-400"
      stepLabel="Step 6 of 7"
      title="Weather Forecasts"
      description="Keeps your schedule weather-aware. Outdoor jobs slip automatically when rain hits Eugene."
      serviceId="openweather"
      phaseId="weather"
      accountUrl="https://home.openweathermap.org/users/sign_up"
      accountUrlLabel="Create OpenWeatherMap Account"
      instructions={[
        <>Sign up — free, no credit card.</>,
        <>
          Go to <strong>My API keys</strong>. A default key is waiting for you.
        </>,
        <>Copy it and paste it below.</>,
        <>
          <strong>Heads up:</strong> Brand-new keys take up to 10 minutes to
          activate. If Verify fails, wait a few minutes and retry.
        </>,
      ]}
      fields={[
        {
          key: "OPENWEATHERMAP_API_KEY",
          label: "OpenWeatherMap API Key",
          placeholder: "32-character hex string",
          hint: "Looks like: 508c97eabd85590db5f372f6bdc8c828",
        },
      ]}
    />
  );
}

// ─── Phase: Stripe ──────────────────────────────────────────────────

function StripePhase(props: {
  token: string;
  phaseState: PhaseState;
  onUpdate: (u: Partial<PhaseState>) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  return (
    <KeyCollectionPhase
      {...props}
      allowSkip
      skipHint="You can add Stripe later from Admin → Setup."
      icon={CreditCard}
      iconColor="text-indigo-400"
      stepLabel="Step 7 of 7"
      title="Online Payments"
      description="Lets clients pay milestone invoices online. Skip it if you're not ready — easy to add from Admin → Setup later."
      serviceId="stripe"
      phaseId="stripe"
      accountUrl="https://dashboard.stripe.com/register"
      accountUrlLabel="Open Stripe Signup"
      instructions={[
        <>
          Sign up at Stripe. Business info (EIN/SSN, bank account) only needed
          for live payments.
        </>,
        <>
          Start with <strong>test mode</strong> to explore — no real money
          moves.
        </>,
        <>
          In the dashboard: <strong>Developers → API keys</strong>. Copy your{" "}
          <strong>Secret key</strong> and <strong>Publishable key</strong>.
        </>,
        <>Paste both below and verify.</>,
      ]}
      fields={[
        {
          key: "STRIPE_SECRET_KEY",
          label: "Stripe Secret Key",
          placeholder: "sk_test_... or sk_live_...",
          hint: "Starts with sk_test_ (test mode) or sk_live_ (real payments).",
        },
        {
          key: "STRIPE_PUBLISHABLE_KEY",
          label: "Stripe Publishable Key",
          placeholder: "pk_test_... or pk_live_...",
        },
      ]}
    />
  );
}

// ─── Phase: Complete ────────────────────────────────────────────────

function CompletePhase({
  token,
  phases,
  onBack,
  onReset,
}: {
  token: string;
  phases: Record<PhaseId, PhaseState>;
  onBack: () => void;
  onReset: () => void;
}) {
  const [deploying, setDeploying] = useState(false);
  const [deployed, setDeployed] = useState(false);
  const [deployError, setDeployError] = useState("");
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const verifiedCount = Object.values(phases).filter(
    p => p.status === "verified"
  ).length;
  const totalSetupSteps = PHASE_ORDER.length - 2;

  const triggerFinalDeploy = useCallback(async () => {
    setDeploying(true);
    setDeployError("");
    const result = await provisionPhase(token, "ai", {}, true);
    setDeploying(false);
    if (result.ok || result.deployId) {
      setDeployed(true);
    } else {
      setDeployError(result.error ?? "Deploy trigger failed. Contact Keith.");
    }
  }, [token]);

  return (
    <Card className="bg-neutral-900 border-neutral-800 mt-4">
      <CardHeader>
        <div className="w-14 h-14 rounded-full bg-green-900/30 flex items-center justify-center mb-3">
          <PartyPopper className="w-7 h-7 text-green-400" aria-hidden="true" />
        </div>
        <CardTitle className="text-2xl">Nearly done, Eric.</CardTitle>
        <CardDescription className="text-neutral-400 text-base">
          {verifiedCount} of {totalSetupSteps} steps verified. Here's the final
          move.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          {PHASE_ORDER.filter(p => p !== "welcome" && p !== "complete").map(
            phase => {
              const meta = PHASE_META[phase];
              const Icon = meta.icon;
              const state = phases[phase];
              return (
                <div
                  key={phase}
                  className="flex items-center gap-3 p-3 rounded-md bg-neutral-800/40 border border-neutral-800"
                >
                  <Icon
                    className="w-4 h-4 text-neutral-400"
                    aria-hidden="true"
                  />
                  <span className="text-sm text-neutral-200 flex-1">
                    {meta.title}
                  </span>
                  {state.status === "verified" && (
                    <Badge className="bg-green-900/30 text-green-300 border-0">
                      <CheckCircle2
                        className="w-3 h-3 mr-1"
                        aria-hidden="true"
                      />
                      Verified
                    </Badge>
                  )}
                  {state.status === "skipped" && (
                    <Badge className="bg-neutral-700 text-neutral-300 border-0">
                      Skipped
                    </Badge>
                  )}
                  {state.status === "pending" && (
                    <Badge className="bg-amber-900/30 text-amber-300 border-0">
                      Pending
                    </Badge>
                  )}
                </div>
              );
            }
          )}
        </div>

        {!deployed && (
          <Alert className="bg-[#C8A84B]/10 border-[#C8A84B]/30">
            <AlertCircle
              className="w-4 h-4 text-[#C8A84B]"
              aria-hidden="true"
            />
            <AlertTitle className="text-[#C8A84B]">One last click</AlertTitle>
            <AlertDescription className="text-neutral-300">
              Triggers a production rebuild with your new keys. Takes ~2
              minutes. Your current site stays live until the new build is ready
              — zero downtime.
            </AlertDescription>
          </Alert>
        )}

        {deployError && (
          <Alert className="bg-red-900/20 border-red-700/50">
            <AlertCircle className="w-4 h-4 text-red-400" aria-hidden="true" />
            <AlertDescription className="text-red-200">
              {deployError}
            </AlertDescription>
          </Alert>
        )}

        <Button
          onClick={triggerFinalDeploy}
          disabled={deploying || deployed}
          size="lg"
          className="w-full bg-[#C8A84B] text-neutral-950 hover:bg-[#d4b65a] text-base"
        >
          {deploying ? (
            <>
              <Loader2
                className="w-5 h-5 mr-2 animate-spin"
                aria-hidden="true"
              />
              Deploying…
            </>
          ) : deployed ? (
            <>
              <CheckCircle2 className="w-5 h-5 mr-2" aria-hidden="true" />
              Deployment triggered
            </>
          ) : (
            <>
              <ArrowRight className="w-5 h-5 mr-2" aria-hidden="true" />
              Finalize & Deploy
            </>
          )}
        </Button>

        {deployed && (
          <div className="space-y-3 bg-neutral-800/50 p-4 rounded-md border border-neutral-700">
            <div className="text-sm text-neutral-200 font-medium">
              What happens next:
            </div>
            <ul className="space-y-1.5 text-sm text-neutral-400">
              <li>• Keith gets a notification that you finished setup.</li>
              <li>
                • Site redeploys on your own keys — you're fully independent.
              </li>
              <li>
                • Keith revokes his old keys within 24 hours. Nothing breaks.
              </li>
              <li>
                • Next up: your walkthrough call. Keith reaches out to pick a
                time.
              </li>
            </ul>
            <div className="pt-2 flex flex-col sm:flex-row gap-2">
              <Button
                onClick={() => (window.location.href = "/admin")}
                variant="outline"
                className="border-[#C8A84B] text-[#C8A84B] hover:bg-[#C8A84B]/10"
              >
                Open Admin Dashboard
                <ArrowRight className="w-4 h-4 ml-2" aria-hidden="true" />
              </Button>
              <Button
                onClick={() => setShowResetConfirm(true)}
                variant="ghost"
                className="text-neutral-500 hover:text-neutral-300"
              >
                Reset Wizard
              </Button>
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Button
          variant="ghost"
          onClick={onBack}
          className="text-neutral-400 hover:text-neutral-200"
        >
          <ArrowLeft className="w-4 h-4 mr-2" aria-hidden="true" />
          Back
        </Button>
      </CardFooter>

      <AlertDialog open={showResetConfirm} onOpenChange={setShowResetConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset onboarding?</AlertDialogTitle>
            <AlertDialogDescription>
              Your saved progress for every step will be cleared and you'll
              start over from the beginning. Already-deployed keys remain on
              Netlify.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowResetConfirm(false);
                onReset();
              }}
            >
              Reset
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
