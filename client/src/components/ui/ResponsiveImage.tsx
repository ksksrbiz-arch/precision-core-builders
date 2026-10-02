/**
 * ResponsiveImage — eliminates CLS by reserving aspect-ratio space, fades in
 * only after the actual pixels arrive, and gives above-fold images eager +
 * high-priority loading so the LCP never lazy-pops.
 */
import { useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { netlifySrcSet } from "@/lib/netlifyImage";

interface Props {
  src: string;
  alt: string;
  aspectRatio?: "4/3" | "3/2" | "16/9" | "1/1" | "3/4" | "4/5" | "16/10";
  priority?: boolean;
  className?: string;
  imgClassName?: string;
  sizes?: string;
  onClick?: () => void;
}

export function ResponsiveImage({
  src,
  alt,
  aspectRatio = "4/3",
  priority = false,
  className,
  imgClassName,
  sizes = "(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw",
  onClick,
}: Props) {
  const [loaded, setLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // An image that finished loading before React attached `onLoad` (browser
  // cache, or the prerendered markup being replaced) never fires it again, so
  // the photo would stay at opacity 0 or fade in from nothing. Catch it here.
  useLayoutEffect(() => {
    const img = imgRef.current;
    if (img?.complete) setLoaded(true);
  }, [src]);

  return (
    <div
      className={cn("relative overflow-hidden bg-neutral-200/10", className)}
      style={{ aspectRatio: aspectRatio.replace("/", " / ") }}
      onClick={onClick}
    >
      <img
        ref={imgRef}
        src={src}
        srcSet={netlifySrcSet(src)}
        alt={alt}
        loading={priority ? "eager" : "lazy"}
        decoding={priority ? "sync" : "async"}
        // React 19 accepts both camelCase and lowercase; keep lowercase for widest support.
        {...({ fetchpriority: priority ? "high" : "auto" } as Record<
          string,
          string
        >)}
        sizes={sizes}
        onLoad={() => setLoaded(true)}
        // A failed image must not leave an invisible hole; show what the
        // browser shows (alt text / broken-image) instead of opacity 0.
        onError={() => setLoaded(true)}
        draggable={false}
        className={cn(
          "absolute inset-0 h-full w-full object-cover",
          // Fade only when the pixels really arrive late; a photo that was
          // already in cache appears instantly instead of replaying the fade.
          loaded ? "opacity-100" : "opacity-0",
          "transition-opacity duration-500",
          imgClassName
        )}
      />
    </div>
  );
}
