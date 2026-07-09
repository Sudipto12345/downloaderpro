import { useId } from "react";
import { cn } from "@/lib/utils";

export type PlatformId = "youtube" | "tiktok" | "instagram" | "facebook" | "x" | "all-in-one";

interface PlatformLogoProps {
  platform: PlatformId;
  className?: string;
}

export function PlatformLogo({ platform, className }: PlatformLogoProps) {
  const uid = useId().replace(/:/g, "");

  switch (platform) {
    case "youtube":
      return (
        <svg viewBox="0 0 24 24" className={cn("h-full w-full", className)} aria-hidden>
          <rect width="24" height="24" rx="6" fill="#FF0000" />
          <path
            fill="#fff"
            d="M10 8.5v7l6-3.5-6-3.5z"
          />
        </svg>
      );
    case "tiktok":
      return (
        <svg viewBox="0 0 24 24" className={cn("h-full w-full", className)} aria-hidden>
          <rect width="24" height="24" rx="6" fill="#010101" />
          <path
            fill="#25F4EE"
            d="M15.5 8.2v2.1a4.2 4.2 0 0 1-2.6-.9v5.4a3.4 3.4 0 1 1-3.4-3.4c.2 0 .4 0 .6.1v2.2a1.2 1.2 0 1 0 .8 1.1V6h2a4.8 4.8 0 0 0 2.6 2.2z"
          />
          <path
            fill="#FE2C55"
            d="M17.1 7.3a4.9 4.9 0 0 1-1.6-1.2H13.5v8.5a1.2 1.2 0 1 1-2-.9V8.1a3.4 3.4 0 1 0 2.8 6.7 3.5 3.5 0 0 0 .2-1.1V9.1a6.2 6.2 0 0 0 2.6 1.2V7.8a4.8 4.8 0 0 1-2-.5z"
          />
        </svg>
      );
    case "instagram":
      return (
        <svg viewBox="0 0 24 24" className={cn("h-full w-full", className)} aria-hidden>
          <defs>
            <linearGradient id={`ig-grad-${uid}`} x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#FD5949" />
              <stop offset="50%" stopColor="#D6249F" />
              <stop offset="100%" stopColor="#285AEB" />
            </linearGradient>
          </defs>
          <rect width="24" height="24" rx="6" fill={`url(#ig-grad-${uid})`} />
          <rect x="6.5" y="6.5" width="11" height="11" rx="3.5" fill="none" stroke="#fff" strokeWidth="1.8" />
          <circle cx="12" cy="12" r="2.8" fill="none" stroke="#fff" strokeWidth="1.8" />
          <circle cx="16.2" cy="7.8" r="1.1" fill="#fff" />
        </svg>
      );
    case "facebook":
      return (
        <svg viewBox="0 0 24 24" className={cn("h-full w-full", className)} aria-hidden>
          <rect width="24" height="24" rx="6" fill="#1877F2" />
          <path
            fill="#fff"
            d="M14.5 8.5h-1.8c-.9 0-1.2.4-1.2 1.2v1.5H14l-.3 2.3h-1.8v7h-2.4v-7H8.5V11h1.4V8.8c0-2.2 1.3-3.4 3.3-3.4H14.5v2.1z"
          />
        </svg>
      );
    case "x":
      return (
        <svg viewBox="0 0 24 24" className={cn("h-full w-full", className)} aria-hidden>
          <rect width="24" height="24" rx="6" fill="#000" />
          <path
            fill="#fff"
            d="M13.2 10.8 18.4 5h-1.2l-4.5 5-3.6-5H5.5l5.5 7.3L5 19h1.2l4.8-5.5 3.8 5.5h3.6l-5.7-7.7zm-1.7 2 -.6-.8-4.4-5.6h1.9l3.5 4.5.6.8 4.6 5.9h-1.9l-3.7-4.8z"
          />
        </svg>
      );
    case "all-in-one":
      return (
        <svg viewBox="0 0 24 24" className={cn("h-full w-full", className)} aria-hidden>
          <defs>
            <linearGradient id={`aio-grad-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#8B5CF6" />
              <stop offset="100%" stopColor="#EC4899" />
            </linearGradient>
          </defs>
          <rect width="24" height="24" rx="6" fill={`url(#aio-grad-${uid})`} />
          <path
            fill="#fff"
            d="M6 8h4v4H6V8zm0 6h4v4H6v-4zm6-6h6v2.5h-6V8zm0 3.5h6V14h-6v-2.5zm0 3.5h6V20h-6v-4z"
          />
        </svg>
      );
  }
}
