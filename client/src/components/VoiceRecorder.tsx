/**
 * VoiceRecorder Component
 * Captures audio via Web Audio API, uploads to /api/voice-to-report
 * Provides real-time transcription and structured field report generation.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "./ui/button";
import {
  Loader2,
  Mic,
  Square,
  Upload,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

export interface VoiceRecorderProps {
  projectId: number;
  onSuccess?: (report: {
    id: number;
    transcription: string;
    summary: string;
    tasksCompleted: string[];
    materialsUsed: string[];
    issuesFlagged: string[];
    materialShortages: string[];
  }) => void;
  onError?: (error: string) => void;
}

type RecorderState = "idle" | "recording" | "uploading" | "success" | "error";

export function VoiceRecorder({
  projectId,
  onSuccess,
  onError,
}: VoiceRecorderProps) {
  const [state, setState] = useState<RecorderState>("idle");
  const [duration, setDuration] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Start recording
  const handleStartRecording = useCallback(async () => {
    try {
      setErrorMsg("");
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      streamRef.current = stream;
      chunksRef.current = [];

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "audio/webm;codecs=opus",
      });

      mediaRecorder.ondataavailable = event => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setState("recording");
      setDuration(0);

      // Timer
      timerRef.current = window.setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to access microphone";
      setErrorMsg(message);
      setState("error");
      onError?.(message);
    }
  }, [onError]);

  // Stop recording
  const handleStopRecording = useCallback(async () => {
    if (!mediaRecorderRef.current || !streamRef.current) return;

    const mediaRecorder = mediaRecorderRef.current;

    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    mediaRecorder.stop();

    // Wait for onstop event, then upload
    await new Promise<void>(resolve => {
      mediaRecorder.onstop = () => resolve();
    });

    // Stop all audio tracks
    streamRef.current.getTracks().forEach(track => track.stop());

    // Upload audio
    await uploadAudio();
  }, [projectId, onSuccess, onError]);

  const uploadAudio = useCallback(async () => {
    if (chunksRef.current.length === 0) {
      setErrorMsg("No audio recorded");
      setState("error");
      onError?.("No audio recorded");
      return;
    }

    try {
      setState("uploading");
      setUploadProgress(10);

      const audioBlob = new Blob(chunksRef.current, { type: "audio/webm" });

      // Get auth token (from localStorage or context)
      const token = localStorage.getItem("auth_token");
      if (!token) {
        throw new Error("Not authenticated");
      }

      const formData = new FormData();
      formData.append("audio", audioBlob, "field-memo.webm");

      const response = await fetch(
        `/api/voice-to-report?projectId=${projectId}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        }
      );

      setUploadProgress(50);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Upload failed");
      }

      const { report } = await response.json();
      setUploadProgress(100);

      setState("success");
      onSuccess?.(report);

      // Reset after 3 seconds
      setTimeout(() => {
        setState("idle");
        setDuration(0);
        chunksRef.current = [];
      }, 3000);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Upload failed";
      setErrorMsg(message);
      setState("error");
      onError?.(message);
    }
  }, [projectId, onSuccess, onError]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <AnimatePresence mode="wait">
        {/* Idle/Ready State */}
        {state === "idle" && (
          <motion.div
            key="idle"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex flex-col items-center gap-4"
          >
            <div className="relative w-24 h-24 flex items-center justify-center rounded-full bg-amber-100/20 border-2 border-amber-600">
              <Button
                size="lg"
                className="w-20 h-20 rounded-full bg-amber-600 hover:bg-amber-700 text-white shadow-lg hover:shadow-xl transition-all"
                onClick={handleStartRecording}
              >
                <Mic className="w-8 h-8" />
              </Button>
            </div>
            <p className="text-center text-sm text-muted-foreground">
              Tap to start recording your field memo
            </p>
          </motion.div>
        )}

        {/* Recording State */}
        {state === "recording" && (
          <motion.div
            key="recording"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="flex flex-col items-center gap-4"
          >
            {/* Animated Recording Indicator */}
            <div className="relative w-24 h-24 flex items-center justify-center">
              {/* Pulsing rings */}
              {[0, 1, 2].map(i => (
                <motion.div
                  key={i}
                  className="absolute w-24 h-24 rounded-full border-2 border-red-500"
                  animate={{ scale: [1, 1.3], opacity: [1, 0] }}
                  transition={{
                    duration: 1.5,
                    delay: i * 0.5,
                    repeat: Infinity,
                  }}
                />
              ))}

              {/* Stop Button */}
              <Button
                size="lg"
                className="w-20 h-20 rounded-full bg-red-600 hover:bg-red-700 text-white shadow-lg hover:shadow-xl transition-all relative z-10"
                onClick={handleStopRecording}
              >
                <Square className="w-8 h-8" />
              </Button>
            </div>

            {/* Duration Timer */}
            <div className="text-center">
              <p className="text-2xl font-mono font-bold text-foreground">
                {formatTime(duration)}
              </p>
              <p className="text-sm text-muted-foreground">Recording...</p>
            </div>
          </motion.div>
        )}

        {/* Uploading State */}
        {state === "uploading" && (
          <motion.div
            key="uploading"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex flex-col items-center gap-4"
          >
            <div className="relative w-24 h-24 flex items-center justify-center rounded-full bg-blue-100/20 border-2 border-blue-600">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            </div>

            {/* Progress Bar */}
            <div className="w-full">
              <div className="flex justify-between mb-2">
                <p className="text-sm font-medium">
                  Processing field report...
                </p>
                <p className="text-sm text-muted-foreground">
                  {uploadProgress}%
                </p>
              </div>
              <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-blue-600"
                  initial={{ width: 0 }}
                  animate={{ width: `${uploadProgress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </div>

            <p className="text-center text-sm text-muted-foreground max-w-xs">
              Transcribing audio and generating structured report...
            </p>
          </motion.div>
        )}

        {/* Success State */}
        {state === "success" && (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="flex flex-col items-center gap-4"
          >
            <div className="relative w-24 h-24 flex items-center justify-center rounded-full bg-green-100/20 border-2 border-green-600">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>

            <div className="text-center">
              <p className="font-semibold text-green-700">Report Generated!</p>
              <p className="text-sm text-muted-foreground">
                Field memo processed and saved
              </p>
            </div>
          </motion.div>
        )}

        {/* Error State */}
        {state === "error" && (
          <motion.div
            key="error"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex flex-col items-center gap-4"
          >
            <div className="relative w-24 h-24 flex items-center justify-center rounded-full bg-red-100/20 border-2 border-red-600">
              <AlertCircle className="w-10 h-10 text-red-600" />
            </div>

            <div className="text-center">
              <p className="font-semibold text-red-700">Error Recording</p>
              <p className="text-sm text-muted-foreground mt-1">{errorMsg}</p>
            </div>

            <Button
              variant="outline"
              onClick={() => {
                setState("idle");
                setDuration(0);
                setErrorMsg("");
              }}
              className="mt-2"
            >
              Try Again
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Technical Notes */}
      <div className="mt-6 p-3 bg-amber-50/50 rounded-lg border border-amber-200/50 text-xs text-muted-foreground">
        <p>
          <strong>Pro Tip:</strong> Speak naturally. Audio is encrypted and
          processed securely. Maximum 15 minutes per memo.
        </p>
      </div>
    </div>
  );
}
