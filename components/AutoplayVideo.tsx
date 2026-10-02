"use client";

import { useEffect, useRef } from "react";
import { asset } from "@/lib/paths";

type AutoplayVideoProps = {
  src: string;
  poster?: string;
  className?: string;
  loop?: boolean;
  controls?: boolean;
};

export function AutoplayVideo({
  src,
  poster,
  className,
  loop = false,
  controls = false,
}: AutoplayVideoProps) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;

    video.muted = true;
    const start = () => {
      video.play().catch(() => {});
    };

    start();
    video.addEventListener("loadeddata", start);
    return () => video.removeEventListener("loadeddata", start);
  }, []);

  return (
    <video
      ref={ref}
      className={className}
      autoPlay
      muted
      loop={loop}
      controls={controls}
      playsInline
      poster={poster ? asset(poster) : undefined}
      preload="auto"
    >
      <source src={asset(src)} type="video/mp4" />
    </video>
  );
}
