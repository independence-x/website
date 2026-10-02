"use client";

import { useEffect, useId, useState } from "react";

export function Shot({
  src,
  alt,
  caption,
}: {
  src: string;
  alt: string;
  caption?: string;
}) {
  const [open, setOpen] = useState(false);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group block w-full overflow-hidden rounded-2xl border border-line bg-ink-2 text-left"
      >
        <img src={src} alt={alt} className="w-full transition duration-500 group-hover:scale-[1.01]" />
      </button>
      {caption && <p className="mt-3 text-sm leading-6 text-mist">{caption}</p>}
      {open && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          onClick={() => setOpen(false)}
        >
          <div className="max-h-[92vh] max-w-5xl overflow-auto" onClick={(e) => e.stopPropagation()}>
            <p id={titleId} className="sr-only">
              {alt}
            </p>
            <img src={src} alt={alt} className="max-h-[86vh] w-auto max-w-full rounded-xl" />
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="mt-3 text-sm text-paper underline"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
