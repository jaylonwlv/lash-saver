"use client";

import { useEffect, useRef, useState } from "react";

type Photo = { id: string; url: string; width: number; height: number };

/**
 * The pro's work, in a row a client swipes at their own pace. Tapping a photo opens
 * it full screen, where swiping moves between them. Without JavaScript it's still a
 * swipeable row. Nothing moves on its own.
 */
export function WorkPhotos({ photos }: { photos: Photo[] }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const strip = useRef<HTMLDivElement>(null);
  const [opened, setOpened] = useState<number | null>(null);

  useEffect(() => {
    if (opened === null) return;
    const modal = dialog.current;
    if (!modal) return;
    if (!modal.open) modal.showModal();
    if (strip.current) strip.current.scrollLeft = opened * strip.current.clientWidth;
  }, [opened]);

  return (
    <>
      <ul className="flex snap-x snap-mandatory [scrollbar-width:none] gap-3 overflow-x-auto scroll-smooth px-6 pb-2">
        {photos.map((photo, i) => (
          <li key={photo.id} className="shrink-0 snap-center">
            <button
              type="button"
              onClick={() => setOpened(i)}
              aria-label={`Open photo ${i + 1} of ${photos.length}`}
              className="press block overflow-hidden rounded-[22px]"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- sized on upload, served from storage */}
              <img
                src={photo.url}
                alt="Photo of the work"
                width={photo.width}
                height={photo.height}
                loading="lazy"
                decoding="async"
                className="aspect-[4/5] w-[68vw] max-w-72 object-cover"
              />
            </button>
          </li>
        ))}
      </ul>
      <dialog
        ref={dialog}
        aria-label="Photos of the work"
        onClose={() => setOpened(null)}
        className="fixed inset-0 m-0 h-full max-h-none w-full max-w-none bg-black p-0 backdrop:bg-black"
      >
        {opened !== null && (
          <div
            ref={strip}
            className="flex h-full snap-x snap-mandatory [scrollbar-width:none] overflow-x-auto"
          >
            {photos.map((photo) => (
              // eslint-disable-next-line @next/next/no-img-element -- sized on upload, served from storage
              <img
                key={photo.id}
                src={photo.url}
                alt="Photo of the work"
                className="h-full w-full shrink-0 snap-center object-contain"
              />
            ))}
          </div>
        )}
        <button
          type="button"
          onClick={() => dialog.current?.close()}
          aria-label="Close photos"
          className="absolute top-[max(0.75rem,env(safe-area-inset-top))] right-3 flex size-12 items-center justify-center rounded-full bg-black/60 text-xl text-white"
        >
          ✕
        </button>
      </dialog>
    </>
  );
}
