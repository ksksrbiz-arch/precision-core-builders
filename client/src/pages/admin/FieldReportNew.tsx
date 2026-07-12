/**
 * New Field Report — voice recording UI + AI report generation.
 * Transcription priority:
 *   1. Web Speech API (browser-native, free) — used when available
 *   2. Server-side Whisper router (free Groq Whisper first, legacy OpenAI
 *      Whisper only as a fallback) — used when Web Speech is unavailable
 */
import DashboardLayout from "@/components/DashboardLayout";
import { GuideHelpButton } from "@/components/GuideHelpButton";
import { useMutationWithToast } from "@/_core/hooks/useMutationWithToast";
import { trpc } from "@/lib/trpc";
import { getAuthHeader } from "@/lib/authHeader";
import { useIsMobile } from "@/hooks/useMobile";
import {
  Mic,
  MicOff,
  Square,
  Send,
  Loader2,
  ArrowLeft,
  Check,
  CheckCircle2,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";

type Step = "select" | "record" | "processing" | "review" | "done";

type SpeechRecognitionAlternativeLike = {
  transcript: string;
};

type SpeechRecognitionResultLike =
  ArrayLike<SpeechRecognitionAlternativeLike> & {
    isFinal: boolean;
  };

type SpeechRecognitionEventLike = Event & {
  results: ArrayLike<SpeechRecognitionResultLike>;
};

type SpeechRecognitionErrorEventLike = Event & {
  error: string;
};

interface BrowserSpeechRecognition {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}

// Web Speech API type declarations
declare global {
  interface Window {
    SpeechRecognition?: new () => BrowserSpeechRecognition;
    webkitSpeechRecognition?: new () => BrowserSpeechRecognition;
  }
}

const SpeechRecognitionAPI:
  | (new () => BrowserSpeechRecognition)
  | null
  | undefined =
  typeof window !== "undefined"
    ? (window.SpeechRecognition ?? window.webkitSpeechRecognition)
    : null;

const SPEECH_ERROR_MESSAGES: Record<string, string> = {
  "not-allowed":
    "Microphone access denied. Please allow microphone permission and try again.",
  "no-speech": "No speech detected. Please try speaking again.",
  network:
    "Network error during speech recognition. Please check your connection.",
  "audio-capture":
    "No microphone found. Please connect a microphone and try again.",
};

export default function FieldReportNew() {
  const [, setLocation] = useLocation();
  const isMobile = useIsMobile();
  const [step, setStep] = useState<Step>("select");
  const [projectId, setProjectId] = useState<number | null>(null);
  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  // Web Speech API state
  const [liveTranscript, setLiveTranscript] = useState("");
  const [finalTranscript, setFinalTranscript] = useState("");
  const speechRef = useRef<BrowserSpeechRecognition | null>(null);
  const usingWebSpeech = SpeechRecognitionAPI !== null;
  const [recordingTime, setRecordingTime] = useState(0);
  const [report, setReport] = useState<any>(null);
  const [editedSummary, setEditedSummary] = useState("");
  const [error, setError] = useState("");
  const mediaRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const { data: projects } = trpc.projects.list.useQuery({ pageSize: 50 });
  const utils = trpc.useUtils();
  const publishMutation = useMutationWithToast(
    trpc.fieldReports.publish.useMutation(),
    {
      success: "Report Published",
      successMessage: "Field report sent to client portal.",
      error: "Publish Failed",
      errorMessage: "Failed to publish report. Please try again.",
      invalidate: () => utils.fieldReports.list.invalidate(),
      onSuccess: () => setStep("done"),
    }
  );

  const updateMutation = trpc.fieldReports.update.useMutation();

  /**
   * Persist any edits the user made to the AI-generated summary before
   * publishing or saving. Without this, corrections typed into the review
   * textarea are silently discarded and the client sees the original AI text.
   */
  const persistSummaryEdits = async () => {
    if (
      report?.id &&
      editedSummary.trim() &&
      editedSummary !== (report.summary ?? "")
    ) {
      await updateMutation.mutateAsync({
        id: report.id,
        summary: editedSummary,
      });
      setReport((prev: any) =>
        prev ? { ...prev, summary: editedSummary } : prev
      );
    }
  };

  const startRecording = async () => {
    setError("");
    setLiveTranscript("");
    setFinalTranscript("");
    setRecordingTime(0);

    if (usingWebSpeech) {
      // ── Web Speech API path (free, browser-native) ──────────────────────────
      try {
        const sr = new SpeechRecognitionAPI!();
        sr.continuous = true;
        sr.interimResults = true;
        sr.lang = "en-US";

        sr.onresult = (e: SpeechRecognitionEventLike) => {
          let interim = "";
          let final = "";
          for (let i = 0; i < e.results.length; i++) {
            if (e.results[i].isFinal) {
              final += e.results[i][0].transcript + " ";
            } else {
              interim += e.results[i][0].transcript;
            }
          }
          setFinalTranscript(final);
          setLiveTranscript(interim);
        };

        sr.onerror = (e: SpeechRecognitionErrorEventLike) => {
          if (e.error !== "aborted") {
            setError(
              SPEECH_ERROR_MESSAGES[e.error] ??
                "Speech recognition failed. Please try again or use a different browser."
            );
          }
        };

        sr.onend = () => {
          setRecording(false);
          if (timerRef.current) clearInterval(timerRef.current);
        };

        sr.start();
        speechRef.current = sr;
        setRecording(true);
        timerRef.current = setInterval(
          () => setRecordingTime(t => t + 1),
          1000
        );
      } catch (err) {
        setError(
          "Could not start speech recognition. Please check microphone permissions."
        );
      }
    } else {
      // ── MediaRecorder fallback (audio blob → Whisper server-side) ───────────
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        const mr = new MediaRecorder(stream, { mimeType: "audio/webm" });
        mediaRef.current = mr;
        chunksRef.current = [];
        mr.ondataavailable = e => {
          if (e.data.size > 0) chunksRef.current.push(e.data);
        };
        mr.onstop = () => {
          const blob = new Blob(chunksRef.current, { type: "audio/webm" });
          setAudioBlob(blob);
          stream.getTracks().forEach(t => t.stop());
        };
        mr.start(1000);
        setRecording(true);
        timerRef.current = setInterval(
          () => setRecordingTime(t => t + 1),
          1000
        );
      } catch (err) {
        setError("Could not access microphone. Please check permissions.");
      }
    }
  };

  const stopRecording = () => {
    if (usingWebSpeech) {
      speechRef.current?.stop();
    } else {
      mediaRef.current?.stop();
    }
    setRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  useEffect(
    () => () => {
      if (timerRef.current) clearInterval(timerRef.current);
    },
    []
  );

  const processAudio = async () => {
    if (usingWebSpeech) {
      // Web Speech path — transcript already captured, send text directly
      const transcript = (finalTranscript + liveTranscript).trim();
      if (!transcript) {
        setError("No speech detected. Please try recording again.");
        return;
      }
      if (!projectId) return;
      setStep("processing");
      setError("");
      try {
        const res = await fetch(`/api/voice-to-report`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(await getAuthHeader()),
          },
          body: JSON.stringify({ projectId, transcript }),
        });
        const data = await res.json();
        if (!res.ok) {
          if (res.status === 401 || res.status === 403) {
            throw new Error(
              "Authentication required. Please sign in again and retry."
            );
          }
          if (res.status === 429) {
            throw new Error(
              "Voice report limit reached. Please wait before submitting again."
            );
          }
          throw new Error(
            data.error ?? "Report generation failed. Please try again."
          );
        }
        setReport(data.report);
        setEditedSummary(data.report.summary ?? "");
        setStep("review");
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Report generation failed."
        );
        setStep("record");
      }
    } else {
      // Whisper path — encode audio blob as base64 and send as JSON
      if (!audioBlob || !projectId) return;
      setStep("processing");
      setError("");
      try {
        // Convert blob to base64 safely (chunk-based to avoid stack overflow)
        const arrayBuf = await audioBlob.arrayBuffer();
        const uint8 = new Uint8Array(arrayBuf);
        let binary = "";
        const chunkSize = 8192;
        for (let i = 0; i < uint8.length; i += chunkSize) {
          const chunk = uint8.subarray(i, i + chunkSize);
          let segment = "";
          for (let j = 0; j < chunk.length; j++) {
            segment += String.fromCharCode(chunk[j]);
          }
          binary += segment;
        }
        const base64Audio = btoa(binary);
        const res = await fetch(`/api/voice-to-report`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(await getAuthHeader()),
          },
          body: JSON.stringify({
            projectId,
            audio: base64Audio,
            mimeType: "audio/webm",
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          if (res.status === 401 || res.status === 403) {
            throw new Error(
              "Authentication required. Please sign in again and retry."
            );
          }
          if (res.status === 429) {
            throw new Error(
              "Voice report limit reached. Please wait before submitting again."
            );
          }
          throw new Error(
            data.error ?? "Report generation failed. Please try again."
          );
        }
        setReport(data.report);
        setEditedSummary(data.report.summary ?? "");
        setStep("review");
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Report generation failed."
        );
        setStep("record");
      }
    }
  };

  const publishReport = async () => {
    if (!report?.id) return;
    await persistSummaryEdits();
    await publishMutation.mutateAsync({ id: report.id });

    // Fire field_report_created n8n event to notify client
    fetch("/api/n8n-webhook", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event: "field_report_created",
        payload: {
          reportId: report.id,
          projectId: report.project_id,
          reportDate: report.report_date,
          publishedToClient: true,
        },
      }),
    }).catch(() => {});

    setStep("done");
  };

  const fmt = (s: number) =>
    `${Math.floor(s / 60)
      .toString()
      .padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;
  const parseJSON = (s: string | null): string[] => {
    try {
      return JSON.parse(s ?? "[]");
    } catch {
      return [];
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-2xl md:max-w-3xl mx-auto">
        <button
          onClick={() => setLocation("/admin/field-reports")}
          className="flex min-h-11 items-center gap-2 text-xs text-muted-foreground hover:text-primary mb-6 transition-colors"
          style={{ fontFamily: "var(--font-condensed)" }}
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Field Reports
        </button>
        <h1
          className="text-2xl font-semibold mb-6 flex items-center gap-2"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          New Field Report
          <GuideHelpButton guideId="field-reports" />
        </h1>

        {(() => {
          const stages = ["Select", "Record", "Review", "Publish"];
          const stageIndex =
            step === "select"
              ? 0
              : step === "record"
                ? 1
                : step === "processing" || step === "review"
                  ? 2
                  : 3;
          return (
            <ol
              className="flex items-center gap-2 mb-8"
              aria-label="Field report progress"
            >
              {stages.map((label, i) => {
                const done = i < stageIndex;
                const active = i === stageIndex;
                return (
                  <li
                    key={label}
                    className="flex items-center gap-2 flex-1 last:flex-none"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        aria-current={active ? "step" : undefined}
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                          done
                            ? "bg-primary text-primary-foreground"
                            : active
                              ? "border border-primary bg-primary/15 text-primary"
                              : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {done ? <Check className="h-4 w-4" /> : i + 1}
                      </span>
                      <span
                        className={`text-xs font-semibold hidden sm:inline ${
                          active ? "text-foreground" : "text-muted-foreground"
                        }`}
                        style={{ fontFamily: "var(--font-condensed)" }}
                      >
                        {label}
                      </span>
                    </div>
                    {i < stages.length - 1 && (
                      <span
                        className={`h-0.5 flex-1 rounded ${
                          i < stageIndex ? "bg-primary" : "bg-border"
                        }`}
                      />
                    )}
                  </li>
                );
              })}
            </ol>
          );
        })()}

        {step === "select" && (
          <div className="bg-card border border-border/60 p-6">
            <p className="text-sm text-muted-foreground mb-4 font-light">
              Select the project for this field report:
            </p>
            <div className="space-y-2 mb-5">
              {projects?.data
                .filter(
                  p => p.status === "in_progress" || p.status === "contracted"
                )
                .map(p => (
                  <button
                    key={p.id}
                    onClick={() => setProjectId(p.id)}
                    className={`w-full text-left p-4 md:p-5 border transition-colors ${
                      projectId === p.id
                        ? "border-primary bg-primary/5 text-foreground"
                        : "border-border/60 text-muted-foreground hover:border-primary/40"
                    }`}
                  >
                    <p className="text-sm font-medium">{p.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {p.city}, {p.state}
                    </p>
                  </button>
                ))}
            </div>
            <button
              onClick={() => projectId && setStep("record")}
              disabled={!projectId}
              className="w-full py-3 min-h-11 bg-primary text-primary-foreground text-[11px] md:text-xs font-bold tracking-widest uppercase hover:bg-primary/85 disabled:opacity-50 transition-colors"
              style={{ fontFamily: "var(--font-condensed)" }}
            >
              Continue to Recording →
            </button>
          </div>
        )}

        {step === "record" && (
          <div className="bg-card border border-border/60 p-8 text-center">
            <p className="text-xs text-muted-foreground mb-6 font-light">
              Project:{" "}
              <strong className="text-foreground">
                {projects?.data.find(p => p.id === projectId)?.name}
              </strong>
            </p>
            {usingWebSpeech && (
              <p className="text-[10px] bg-green-500/10 text-green-600 border border-green-500/20 rounded px-2 py-1 inline-block mb-4">
                🎙️ Using browser speech recognition — no API key required
              </p>
            )}
            {/* Recording indicator — larger on mobile for glove-friendly tap */}
            <div
              className={`rounded-full border-4 flex items-center justify-center mx-auto mb-6 transition-all ${
                isMobile ? "h-44 w-44" : "h-28 w-28"
              } ${
                recording
                  ? "border-red-500 bg-red-500/10 animate-pulse"
                  : "border-border/60 bg-card"
              }`}
            >
              {recording ? (
                <Mic
                  className={`text-red-400 ${isMobile ? "h-16 w-16" : "h-10 w-10"}`}
                />
              ) : (
                <Mic
                  className={`text-muted-foreground ${isMobile ? "h-16 w-16" : "h-10 w-10"}`}
                />
              )}
            </div>
            {recording && (
              <p
                className={`font-mono text-foreground mb-2 ${isMobile ? "text-4xl" : "text-3xl"}`}
              >
                {fmt(recordingTime)}
              </p>
            )}

            {/* Live transcript preview (Web Speech only) */}
            {usingWebSpeech && (finalTranscript || liveTranscript) && (
              <div className="text-left bg-muted/30 border border-border/40 rounded p-3 mb-4 max-h-32 overflow-y-auto">
                <p className="text-xs text-foreground leading-relaxed">
                  {finalTranscript}
                  {liveTranscript && (
                    <span className="text-muted-foreground italic">
                      {liveTranscript}
                    </span>
                  )}
                </p>
              </div>
            )}

            <p className="text-sm text-muted-foreground mb-8 font-light">
              {recording
                ? "Recording… speak clearly about today's progress, materials, and any issues."
                : usingWebSpeech && finalTranscript
                  ? "Recording complete. Review transcript above, then process."
                  : "Press record when ready to report on today's site work."}
            </p>
            {error && <p className="text-sm text-destructive mb-4">{error}</p>}
            <div className="flex gap-3 justify-center flex-wrap">
              {!recording && !audioBlob && !finalTranscript && (
                <button
                  onClick={startRecording}
                  className={`flex items-center gap-2 px-6 bg-red-500 text-white text-[11px] font-bold tracking-widest uppercase hover:bg-red-600 transition-colors active:scale-95 ${
                    isMobile ? "py-4 w-full justify-center" : "py-3"
                  }`}
                  style={{ fontFamily: "var(--font-condensed)" }}
                >
                  <Mic className={isMobile ? "h-5 w-5" : "h-4 w-4"} /> Start
                  Recording
                </button>
              )}
              {recording && (
                <button
                  onClick={stopRecording}
                  className={`flex items-center gap-2 px-6 bg-foreground text-background text-[11px] font-bold tracking-widest uppercase hover:opacity-90 transition-opacity active:scale-95 ${
                    isMobile ? "py-4 w-full justify-center" : "py-3"
                  }`}
                  style={{ fontFamily: "var(--font-condensed)" }}
                >
                  <Square className={isMobile ? "h-5 w-5" : "h-4 w-4"} /> Stop
                </button>
              )}
              {/* Web Speech path: show re-record + process after recording stops */}
              {usingWebSpeech && !recording && finalTranscript && (
                <>
                  <button
                    onClick={() => {
                      setFinalTranscript("");
                      setLiveTranscript("");
                      setRecordingTime(0);
                    }}
                    className={`px-5 min-h-11 border border-border/60 text-muted-foreground text-[11px] md:text-xs font-bold tracking-widest uppercase hover:border-primary/40 transition-colors active:scale-95 ${
                      isMobile ? "py-4 flex-1" : "py-3"
                    }`}
                    style={{ fontFamily: "var(--font-condensed)" }}
                  >
                    <MicOff className="h-4 w-4 inline mr-1" /> Re-record
                  </button>
                  <button
                    onClick={processAudio}
                    className={`flex min-h-11 items-center gap-2 px-6 bg-primary text-primary-foreground text-[11px] md:text-xs font-bold tracking-widest uppercase hover:bg-primary/85 transition-colors active:scale-95 ${
                      isMobile ? "py-4 flex-1 justify-center" : "py-3"
                    }`}
                    style={{ fontFamily: "var(--font-condensed)" }}
                  >
                    <Send className="h-4 w-4" /> Process Report
                  </button>
                </>
              )}
              {/* MediaRecorder path: show re-record + process after audio captured */}
              {!usingWebSpeech && audioBlob && !recording && (
                <>
                  <button
                    onClick={() => {
                      setAudioBlob(null);
                      setRecordingTime(0);
                    }}
                    className={`px-5 min-h-11 border border-border/60 text-muted-foreground text-[11px] md:text-xs font-bold tracking-widest uppercase hover:border-primary/40 transition-colors active:scale-95 ${
                      isMobile ? "py-4 flex-1" : "py-3"
                    }`}
                    style={{ fontFamily: "var(--font-condensed)" }}
                  >
                    <MicOff className="h-4 w-4 inline mr-1" /> Re-record
                  </button>
                  <button
                    onClick={processAudio}
                    className={`flex min-h-11 items-center gap-2 px-6 bg-primary text-primary-foreground text-[11px] md:text-xs font-bold tracking-widest uppercase hover:bg-primary/85 transition-colors active:scale-95 ${
                      isMobile ? "py-4 flex-1 justify-center" : "py-3"
                    }`}
                    style={{ fontFamily: "var(--font-condensed)" }}
                  >
                    <Send className="h-4 w-4" /> Process Report
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {step === "processing" && (
          <div className="bg-card border border-border/60 p-12 text-center">
            <Loader2 className="h-10 w-10 text-primary animate-spin mx-auto mb-4" />
            <p className="text-sm font-medium mb-1">
              {usingWebSpeech
                ? "Generating field report…"
                : "Transcribing your memo…"}
            </p>
            <p className="text-xs text-muted-foreground font-light">
              Generating structured field report with AI
            </p>
          </div>
        )}

        {step === "review" && report && (
          <div className="space-y-4">
            <div className="bg-card border border-border/60 p-5">
              <p
                className="text-[10px] font-bold tracking-[0.18em] uppercase text-muted-foreground mb-3"
                style={{ fontFamily: "var(--font-condensed)" }}
              >
                Report Summary
              </p>
              <textarea
                value={editedSummary}
                onChange={e => setEditedSummary(e.target.value)}
                rows={4}
                className="w-full bg-input border border-border text-sm text-foreground p-3 focus:outline-none focus:border-primary/60 resize-none"
              />
            </div>
            {[
              { key: "tasks_completed", label: "Tasks Completed" },
              { key: "materials_used", label: "Materials Used" },
              { key: "issues_flagged", label: "Issues Flagged" },
              { key: "material_shortages", label: "Material Shortages" },
            ].map(({ key, label }) => {
              const items = parseJSON(report[key]);
              if (!items.length) return null;
              return (
                <div key={key} className="bg-card border border-border/60 p-5">
                  <p
                    className="text-[10px] font-bold tracking-[0.18em] uppercase text-muted-foreground mb-3"
                    style={{ fontFamily: "var(--font-condensed)" }}
                  >
                    {label}
                  </p>
                  <ul className="space-y-1.5">
                    {items.map((item: string, i: number) => (
                      <li
                        key={i}
                        className="flex items-start gap-2 text-sm text-muted-foreground"
                      >
                        <span className="text-primary mt-0.5">·</span> {item}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
            <div className="flex gap-3">
              <button
                onClick={async () => {
                  await persistSummaryEdits();
                  setLocation(`/admin/field-reports/${report.id}`);
                }}
                disabled={updateMutation.isPending}
                className="flex-1 py-3 min-h-11 border border-border/60 text-muted-foreground text-[11px] md:text-xs font-bold tracking-widest uppercase hover:border-primary/40 transition-colors disabled:opacity-50"
                style={{ fontFamily: "var(--font-condensed)" }}
              >
                Save as Draft
              </button>
              <button
                onClick={publishReport}
                disabled={publishMutation.isPending || updateMutation.isPending}
                className="flex-1 flex min-h-11 items-center justify-center gap-2 py-3 bg-primary text-primary-foreground text-[11px] md:text-xs font-bold tracking-widest uppercase hover:bg-primary/85 disabled:opacity-50 transition-colors"
                style={{ fontFamily: "var(--font-condensed)" }}
              >
                {publishMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" /> Publish to Client
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {step === "done" && (
          <div className="bg-card border border-border/60 p-10 text-center">
            <CheckCircle2 className="h-12 w-12 text-green-400 mx-auto mb-4" />
            <h2
              className="text-xl font-semibold mb-2"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Report Published
            </h2>
            <p className="text-sm text-muted-foreground font-light mb-6">
              The client can now view this update in their portal.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => setLocation("/admin/field-reports")}
                className="px-5 py-3 min-h-11 border border-border/60 text-muted-foreground text-[11px] md:text-xs font-bold tracking-widest uppercase hover:border-primary/40 transition-colors"
                style={{ fontFamily: "var(--font-condensed)" }}
              >
                All Reports
              </button>
              <button
                onClick={() => {
                  setStep("select");
                  setAudioBlob(null);
                  setReport(null);
                  setRecordingTime(0);
                }}
                className="px-5 py-3 min-h-11 bg-primary text-primary-foreground text-[11px] md:text-xs font-bold tracking-widest uppercase hover:bg-primary/85 transition-colors"
                style={{ fontFamily: "var(--font-condensed)" }}
              >
                + New Report
              </button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
