/**
 * PhotoGrid — masonry-ish layout for a project's photos.
 * Click to open a lightbox (simple fullscreen overlay). Respects safe areas
 * on notched devices and keeps the close button within the ergonomic zone.
 */
import { useEffect, useState } from "react";
import { ProjectPhoto, photoUrl } from "@/data/projects";
import { ResponsiveImage } from "@/components/ui/ResponsiveImage";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  photos: ProjectPhoto[];
}

export function PhotoGrid({ photos }: Props) {
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  const open = (i: number) => setOpenIdx(i);
  const close = () => setOpenIdx(null);
  const prev = () =>
    setOpenIdx(i => (i === null ? i : (i - 1 + photos.length) % photos.length));
  const next = () =>
    setOpenIdx(i => (i === null ? i : (i + 1) % photos.length));

  // Keyboard shortcuts while lightbox is open
  useEffect(() => {
    if (openIdx === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowLeft") prev();
      else if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openIdx]);

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
        {photos.map((p, i) => (
          <button
            key={p.file}
            type="button"
            onClick={() => open(i)}
            className="group relative overflow-hidden rounded-md bg-neutral-100/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C8A84B] focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.98] transition-transform"
            aria-label={p.caption || `Open photo ${i + 1} of ${photos.length}`}
          >
            <ResponsiveImage
              src={photoUrl(p.file)}
              alt={p.caption || `Project photo ${i + 1}`}
              aspectRatio="4/3"
              priority={i < 3}
              imgClassName="transition-transform duration-700 ease-out group-hover:scale-[1.05]"
              sizes="(max-width: 768px) 50vw, 33vw"
            />
            <div
              className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors pointer-events-none"
              aria-hidden
            />
          </button>
        ))}
      </div>

      <AnimatePresence>
        {openIdx !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4 md:p-8"
            style={{
              paddingTop: "max(1rem, env(safe-area-inset-top))",
              paddingBottom: "max(1rem, env(safe-area-inset-bottom))",
            }}
            onClick={close}
            role="dialog"
            aria-modal="true"
            aria-label="Photo viewer"
          >
            <button
              onClick={e => {
                e.stopPropagation();
                close();
              }}
              className="absolute top-6 right-6 text-white/90 hover:text-white p-3 rounded-full bg-black/50 hover:bg-black/70 transition min-h-[48px] min-w-[48px] flex items-center justify-center"
              style={{ top: "max(1.5rem, env(safe-area-inset-top))" }}
              aria-label="Close viewer"
            >
              <X className="h-6 w-6" />
            </button>
            {photos.length > 1 && (
              <>
                <button
                  onClick={e => {
                    e.stopPropagation();
                    prev();
                  }}
                  className="absolute left-2 md:left-6 text-white/90 hover:text-white p-3 rounded-full bg-black/50 hover:bg-black/70 transition min-h-[48px] min-w-[48px] flex items-center justify-center"
                  aria-label="Previous photo"
                >
                  <ChevronLeft className="h-7 w-7" />
                </button>
                <button
                  onClick={e => {
                    e.stopPropagation();
                    next();
                  }}
                  className="absolute right-2 md:right-6 text-white/90 hover:text-white p-3 rounded-full bg-black/50 hover:bg-black/70 transition min-h-[48px] min-w-[48px] flex items-center justify-center"
                  aria-label="Next photo"
                >
                  <ChevronRight className="h-7 w-7" />
                </button>
              </>
            )}
            <motion.img
              key={openIdx}
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.25 }}
              src={photoUrl(photos[openIdx].file)}
              alt={photos[openIdx].caption || `Photo ${openIdx + 1}`}
              className="max-h-[90vh] max-w-[95vw] object-contain"
              onClick={e => e.stopPropagation()}
              draggable={false}
            />
            {photos[openIdx].caption && (
              <div className="absolute bottom-6 left-0 right-0 text-center text-white/80 text-sm italic pointer-events-none px-4">
                {photos[openIdx].caption}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
