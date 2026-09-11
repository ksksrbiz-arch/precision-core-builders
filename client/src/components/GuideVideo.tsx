/**
 * GuideVideo — Click-to-play walkthrough player for a guide topic.
 *
 * The YouTube iframe is NOT mounted until the user presses play. That keeps
 * the admin shell fast, loads nothing from YouTube for someone who never
 * watches, and — the reason it matters on a job site — means a bad connection
 * costs a still image instead of a stalled embed.
 *
 * Renders nothing when the guide has no recorded video, unless
 * `showPending` is set (training mode wants to show the gap).
 */
import { Button } from "@/components/ui/button";
import {
  getGuideVideo,
  youtubeEmbedUrl,
  youtubeThumbnailUrl,
  youtubeWatchUrl,
} from "@/lib/guide-videos";
import { ExternalLink, Play, VideoOff } from "lucide-react";
import { useState } from "react";

export function GuideVideo({
  guideId,
  guideTitle,
  compact = false,
  showPending = false,
}: {
  guideId: string;
  guideTitle: string;
  /** Tighter type scale for the side sheet. */
  compact?: boolean;
  /** Show a placeholder when no video exists yet instead of rendering null. */
  showPending?: boolean;
}) {
  const [playing, setPlaying] = useState(false);
  const video = getGuideVideo(guideId);

  if (!video) {
    if (!showPending) return null;
    return (
      <div className="border border-dashed border-border/60 bg-muted/20 p-4 flex items-center gap-3">
        <VideoOff className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        <p className="text-xs text-muted-foreground leading-relaxed">
          No walkthrough recorded for{" "}
          <span className="font-medium text-foreground/80">{guideTitle}</span>{" "}
          yet. The written steps below cover everything.
        </p>
      </div>
    );
  }

  const caption = video.title ?? `${guideTitle} walkthrough`;

  if (playing) {
    return (
      <div className="space-y-1.5">
        <div className="relative w-full aspect-video bg-black border border-border/60 overflow-hidden">
          <iframe
            src={youtubeEmbedUrl(video.youtubeId)}
            title={caption}
            allow="accelerometer; autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            className="absolute inset-0 h-full w-full"
          />
        </div>
        <a
          href={youtubeWatchUrl(video.youtubeId)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-primary"
        >
          Trouble playing? Open on YouTube
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    );
  }

  return (
    <Button
      variant="ghost"
      onClick={() => setPlaying(true)}
      aria-label={`Play ${caption}`}
      className="group relative w-full h-auto p-0 overflow-hidden border border-border/60 bg-black/80 hover:bg-black/80"
    >
      <div className="relative w-full aspect-video">
        <img
          src={youtubeThumbnailUrl(video.youtubeId)}
          alt=""
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover opacity-70 transition-opacity group-hover:opacity-90"
        />
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
          <span
            className={`flex items-center justify-center rounded-full bg-primary/90 text-primary-foreground transition-transform group-hover:scale-105 ${
              compact ? "h-10 w-10" : "h-12 w-12"
            }`}
          >
            <Play className={compact ? "h-4 w-4 ml-0.5" : "h-5 w-5 ml-0.5"} />
          </span>
          <span
            className={`font-semibold text-white drop-shadow ${
              compact ? "text-[11px]" : "text-xs"
            }`}
          >
            Watch: {caption}
            {video.duration ? ` (${video.duration})` : ""}
          </span>
        </div>
      </div>
    </Button>
  );
}
