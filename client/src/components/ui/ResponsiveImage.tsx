/**
 * ResponsiveImage — eliminates CLS by reserving aspect-ratio space, fades in
 * only after the actual pixels arrive, and gives above-fold images eager +
 * high-priority loading so the LCP never lazy-pops.
 */
import { useState } from "react";
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
  return (
    <div
      className={cn("relative overflow-hidden bg-neutral-200/10", className)}
      style={{ aspectRatio: aspectRatio.replace("/", " / ") }}
      onClick={onClick}
    >
      <img
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
        draggable={false}
        className={cn(
          "absolute inset-0 h-full w-full object-cover transition-opacity duration-500",
          loaded ? "opacity-100" : "opacity-0",
          imgClassName
        )}
      />
    </div>
  );
}
