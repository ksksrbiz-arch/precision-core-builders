/**
 * Guide video registry.
 *
 * Walkthrough videos are hosted as *unlisted* YouTube videos and referenced
 * here by ID. This file is deliberately the only place a video ID lives, so
 * recording a new walkthrough is a one-line change — no page or component
 * edits, no deploy-time configuration.
 *
 * To add a video:
 *   1. Upload to YouTube as **Unlisted** (not Private — unlisted embeds,
 *      private does not).
 *   2. Copy the ID from the URL: youtu.be/<THIS_PART>
 *   3. Add an entry below keyed by the guide's `id` from `guides-data.ts`.
 *
 * Recording scripts for every slot live in `docs/TRAINING_VIDEOS.md`.
 */

export type GuideVideo = {
  /** YouTube video ID (the part after youtu.be/ or ?v=). */
  youtubeId: string;
  /** Human-readable runtime, e.g. "2 min". Shown on the play button. */
  duration?: string;
  /** Overrides the default "<Guide title> walkthrough" caption. */
  title?: string;
};

/**
 * Keyed by `Guide.id`. Guides with no entry simply render no video —
 * the written guide is always the source of truth.
 */
export const GUIDE_VIDEOS: Record<string, GuideVideo> = {
  // Populate as walkthroughs are recorded, e.g.:
  // "field-reports": { youtubeId: "dQw4w9WgXcQ", duration: "3 min" },
};

/** The video for a guide, or undefined when none has been recorded yet. */
export function getGuideVideo(guideId: string): GuideVideo | undefined {
  return GUIDE_VIDEOS[guideId];
}

/** Whether a walkthrough exists, without materializing the entry. */
export function hasGuideVideo(guideId: string): boolean {
  return Boolean(GUIDE_VIDEOS[guideId]);
}

/** Count of recorded walkthroughs — used for the "x of y" training readout. */
export function recordedVideoCount(): number {
  return Object.keys(GUIDE_VIDEOS).length;
}

/**
 * Privacy-enhanced embed URL. `youtube-nocookie.com` avoids setting tracking
 * cookies until playback, and is the only YouTube host allowed by the CSP
 * `frame-src` directive in `netlify.toml`.
 */
export function youtubeEmbedUrl(youtubeId: string): string {
  return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(
    youtubeId
  )}?autoplay=1&rel=0&modestbranding=1`;
}

/** Poster image for the click-to-play card. */
export function youtubeThumbnailUrl(youtubeId: string): string {
  return `https://i.ytimg.com/vi/${encodeURIComponent(youtubeId)}/hqdefault.jpg`;
}

/** Watch-on-YouTube fallback for when the embed is blocked or offline. */
export function youtubeWatchUrl(youtubeId: string): string {
  return `https://www.youtube.com/watch?v=${encodeURIComponent(youtubeId)}`;
}
