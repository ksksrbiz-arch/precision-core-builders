/**
 * PhotoGrid — masonry-ish layout for a project's photos.
 * Click to open a lightbox (simple fullscreen overlay).
 */
import { useState } from "react";
import { ProjectPhoto, photoUrl } from "@/data/projects";
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
    setOpenIdx((i) => (i === null ? i : (i - 1 + photos.length) % photos.length));
  const next = () =>
    setOpenIdx((i) => (i === null ? i : (i + 1) % photos.length));

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
        {photos.map((p, i) => (
          <button
            key={p.file}
            type="button"
            onClick={() => open(i)}
            className="group relative aspect-[4/3] overflow-hidden rounded-md bg-neutral-100 focus:outline-none focus:ring-2 focus:ring-[#C8A84B] focus:ring-offset-2"
            aria-label={`Open photo ${i + 1} of ${photos.length}`}
          >
            <img
              src={photoUrl(p.file)}
              alt={p.caption || `Project photo ${i + 1}`}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.05]"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
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
            onClick={close}
            role="dialog"
            aria-modal="true"
            aria-label="Photo viewer"
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                close();
              }}
              className="absolute top-4 right-4 text-white/80 hover:text-white p-2 rounded-full bg-black/40 hover:bg-black/60 transition"
              aria-label="Close viewer"
            >
              <X className="h-6 w-6" />
            </button>
            {photos.length > 1 && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    prev();
                  }}
                  className="absolute left-2 md:left-6 text-white/80 hover:text-white p-2 rounded-full bg-black/40 hover:bg-black/60 transition"
                  aria-label="Previous photo"
                >
                  <ChevronLeft className="h-7 w-7" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    next();
                  }}
                  className="absolute right-2 md:right-6 text-white/80 hover:text-white p-2 rounded-full bg-black/40 hover:bg-black/60 transition"
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
              onClick={(e) => e.stopPropagation()}
            />
            {photos[openIdx].caption && (
              <div className="absolute bottom-6 left-0 right-0 text-center text-white/80 text-sm italic pointer-events-none">
                {photos[openIdx].caption}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
