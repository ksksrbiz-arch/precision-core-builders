/**
 * New Field Report — voice recording UI + AI report generation.
 */
import DashboardLayout from "@/components/DashboardLayout";
import { GuideHelpButton } from "@/components/GuideHelpButton";
import { useToast } from "@/components/ToastProvider";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  Mic,
  MicOff,
  Square,
  Send,
  Loader2,
  ArrowLeft,
  CheckCircle2,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";

type Step = "select" | "record" | "processing" | "review" | "done";

export default function FieldReportNew() {
  const [, setLocation] = useLocation();
  const { accessToken } = useAuth();
  const { addToast } = useToast();
  const [step, setStep] = useState<Step>("select");
  const [projectId, setProjectId] = useState<number | null>(null);
  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [report, setReport] = useState<any>(null);
  const [editedSummary, setEditedSummary] = useState("");
  const [error, setError] = useState("");
  const mediaRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const { data: projects } = trpc.projects.list.useQuery({ pageSize: 50 });
  const publishMutation = trpc.fieldReports.publish.useMutation({
    onSuccess: () => {
      addToast({
        type: "success",
        title: "Published",
        message: "Field report sent to client.",
        duration: 4000,
      });
      setStep("done");
    },
    onError: () => {
      addToast({
        type: "error",
        title: "Error",
        message: "Failed to publish report. Please try again.",
        duration: 6000,
      });
    },
  });

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
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
      setRecordingTime(0);
      timerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000);
    } catch (err) {
      setError("Could not access microphone. Please check permissions.");
    }
  };

  const stopRecording = () => {
    mediaRef.current?.stop();
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
    if (!audioBlob || !projectId) return;
    setStep("processing");
    setError("");
    try {
      const formData = new FormData();
      formData.append("audio", audioBlob, "field-memo.webm");
      const res = await fetch(`/api/voice-to-report?projectId=${projectId}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Processing failed");
      setReport(data.report);
      setEditedSummary(data.report.summary ?? "");
      setStep("review");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Processing failed");
      setStep("record");
    }
  };

  const publishReport = async () => {
    if (!report?.id) return;
    await publishMutation.mutateAsync({ id: report.id });
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
      <div className="max-w-2xl mx-auto">
        <button
          onClick={() => setLocation("/admin/field-reports")}
          className="flex items-center gap-2 text-xs text-muted-foreground hover:text-primary mb-6 transition-colors"
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
                    className={`w-full text-left p-4 border transition-colors ${
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
              className="w-full py-3 bg-primary text-primary-foreground text-[11px] font-bold tracking-widest uppercase hover:bg-primary/85 disabled:opacity-50 transition-colors"
              style={{ fontFamily: "var(--font-condensed)" }}
            >
              Continue to Recording →
            </button>
          </div>
        )}

        {step === "record" && (
          <div className="bg-card border border-border/60 p-8 text-center">
            <p className="text-xs text-muted-foreground mb-8 font-light">
              Project:{" "}
              <strong className="text-foreground">
                {projects?.data.find(p => p.id === projectId)?.name}
              </strong>
            </p>
            {/* Recording indicator */}
            <div
              className={`h-28 w-28 rounded-full border-4 flex items-center justify-center mx-auto mb-6 transition-all ${
                recording
                  ? "border-red-500 bg-red-500/10 animate-pulse"
                  : "border-border/60 bg-card"
              }`}
            >
              {recording ? (
                <Mic className="h-10 w-10 text-red-400" />
              ) : (
                <Mic className="h-10 w-10 text-muted-foreground" />
              )}
            </div>
            {recording && (
              <p className="text-3xl font-mono text-foreground mb-2">
                {fmt(recordingTime)}
              </p>
            )}
            <p className="text-sm text-muted-foreground mb-8 font-light">
              {recording
                ? "Recording… speak clearly about today's progress, materials, and any issues."
                : "Press record when ready to report on today's site work."}
            </p>
            {error && <p className="text-sm text-destructive mb-4">{error}</p>}
            <div className="flex gap-3 justify-center">
              {!recording && !audioBlob && (
                <button
                  onClick={startRecording}
                  className="flex items-center gap-2 px-6 py-3 bg-red-500 text-white text-[11px] font-bold tracking-widest uppercase hover:bg-red-600 transition-colors"
                  style={{ fontFamily: "var(--font-condensed)" }}
                >
                  <Mic className="h-4 w-4" /> Start Recording
                </button>
              )}
              {recording && (
                <button
                  onClick={stopRecording}
                  className="flex items-center gap-2 px-6 py-3 bg-foreground text-background text-[11px] font-bold tracking-widest uppercase hover:opacity-90 transition-opacity"
                  style={{ fontFamily: "var(--font-condensed)" }}
                >
                  <Square className="h-4 w-4" /> Stop
                </button>
              )}
              {audioBlob && !recording && (
                <>
                  <button
                    onClick={() => {
                      setAudioBlob(null);
                      setRecordingTime(0);
                    }}
                    className="px-5 py-3 border border-border/60 text-muted-foreground text-[11px] font-bold tracking-widest uppercase hover:border-primary/40 transition-colors"
                    style={{ fontFamily: "var(--font-condensed)" }}
                  >
                    <MicOff className="h-4 w-4 inline mr-1" /> Re-record
                  </button>
                  <button
                    onClick={processAudio}
                    className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground text-[11px] font-bold tracking-widest uppercase hover:bg-primary/85 transition-colors"
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
            <p className="text-sm font-medium mb-1">Transcribing your memo…</p>
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
                onClick={() => setLocation(`/admin/field-reports/${report.id}`)}
                className="flex-1 py-3 border border-border/60 text-muted-foreground text-[11px] font-bold tracking-widest uppercase hover:border-primary/40 transition-colors"
                style={{ fontFamily: "var(--font-condensed)" }}
              >
                Save as Draft
              </button>
              <button
                onClick={publishReport}
                disabled={publishMutation.isPending}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-primary text-primary-foreground text-[11px] font-bold tracking-widest uppercase hover:bg-primary/85 disabled:opacity-50 transition-colors"
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
                className="px-5 py-2.5 border border-border/60 text-muted-foreground text-[11px] font-bold tracking-widest uppercase hover:border-primary/40 transition-colors"
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
                className="px-5 py-2.5 bg-primary text-primary-foreground text-[11px] font-bold tracking-widest uppercase hover:bg-primary/85 transition-colors"
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
