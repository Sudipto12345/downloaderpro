import type { PlatformId } from "@/components/logos/PlatformLogo";

export interface FaqItem {
  q: string;
  a: string;
}

export interface Tool {
  slug: string;
  platformId: PlatformId;
  platform: string;
  name: string;
  /** tailwind gradient classes for the icon chip */
  gradient: string;
  tagline: string;
  h1: string;
  subtitle: string;
  /** SEO meta description */
  description: string;
  keywords: string[];
  placeholder: string;
  capabilities: string[];
  faq: FaqItem[];
}

export const TOOLS: Tool[] = [
  {
    slug: "youtube-downloader",
    platformId: "youtube",
    platform: "YouTube",
    name: "YouTube Downloader",
    gradient: "from-red-500 to-rose-600",
    tagline: "Download YouTube videos, Shorts & MP3",
    h1: "YouTube Video Downloader",
    subtitle:
      "Save YouTube videos, Shorts and playlists in HD, 4K or as MP3 audio — fast, free and watermark-free.",
    description:
      "Free YouTube video downloader. Download YouTube videos, Shorts and music in MP4 (HD, 1080p, 4K) or convert to MP3. No app, no sign-up, no watermark.",
    keywords: [
      "youtube downloader",
      "youtube video downloader",
      "youtube to mp4",
      "youtube to mp3",
      "youtube shorts downloader",
      "download youtube 4k",
    ],
    placeholder: "https://www.youtube.com/watch?v=…",
    capabilities: ["Videos & Shorts", "Up to 4K", "MP3 audio", "Thumbnails", "Playlists"],
    faq: [
      {
        q: "How do I download a YouTube video?",
        a: "Copy the video URL from YouTube, paste it into the box above and click Download. Choose your preferred quality — from 144p up to 4K — or extract MP3 audio.",
      },
      {
        q: "Can I download YouTube Shorts?",
        a: "Yes. Paste any YouTube Shorts link and it will be downloaded just like a regular video, with no watermark.",
      },
      {
        q: "Is it free to download from YouTube?",
        a: "Absolutely. DownloadHub Pro is free to use with no sign-up required for standard downloads.",
      },
      {
        q: "What video quality can I get?",
        a: "We support every resolution the source provides, including 360p, 720p, 1080p Full HD, 2K and 4K Ultra HD where available.",
      },
    ],
  },
  {
    slug: "tiktok-downloader",
    platformId: "tiktok",
    platform: "TikTok",
    name: "TikTok Downloader",
    gradient: "from-cyan-400 to-fuchsia-500",
    tagline: "Download TikTok videos without watermark",
    h1: "TikTok Downloader — No Watermark",
    subtitle:
      "Save TikTok videos without the watermark in full HD, or grab the original sound as MP3. Free and instant.",
    description:
      "Download TikTok videos without watermark in HD. Free TikTok downloader — save TikTok clips to MP4 or extract the audio as MP3. No app, no sign-up.",
    keywords: [
      "tiktok downloader",
      "tiktok no watermark",
      "download tiktok video",
      "tiktok to mp3",
      "save tiktok video",
    ],
    placeholder: "https://www.tiktok.com/@user/video/…",
    capabilities: ["No watermark", "Full HD", "MP3 audio", "Fast & free"],
    faq: [
      {
        q: "Can I download TikTok videos without the watermark?",
        a: "Yes — DownloadHub Pro removes the TikTok watermark automatically, giving you a clean video file.",
      },
      {
        q: "How do I save a TikTok video?",
        a: "Tap Share on the TikTok video, copy the link, paste it above and click Download.",
      },
      {
        q: "Can I extract the sound from a TikTok?",
        a: "Yes, choose the Audio option to download the original TikTok sound as an MP3 file.",
      },
    ],
  },
  {
    slug: "instagram-downloader",
    platformId: "instagram",
    platform: "Instagram",
    name: "Instagram Downloader",
    gradient: "from-pink-500 via-rose-500 to-amber-500",
    tagline: "Download Reels, Stories, Posts & photos",
    h1: "Instagram Downloader",
    subtitle:
      "Save Instagram Reels, Stories, posts, carousels and profile photos in original quality. Fast, free and private.",
    description:
      "Free Instagram downloader for Reels, Stories, posts, carousels and photos. Save Instagram videos and images in HD — no app, no login, no watermark.",
    keywords: [
      "instagram downloader",
      "instagram reels downloader",
      "instagram story download",
      "instagram photo download",
      "download instagram video",
    ],
    placeholder: "https://www.instagram.com/reel/…",
    capabilities: ["Reels", "Stories", "Posts & carousels", "Photos", "HD quality"],
    faq: [
      {
        q: "How do I download an Instagram Reel?",
        a: "Open the Reel, tap the share icon and copy the link, then paste it above and click Download.",
      },
      {
        q: "Can I download Instagram Stories?",
        a: "Yes, you can save public Instagram Stories as video or image files in their original quality.",
      },
      {
        q: "Can I download photos and carousels?",
        a: "Definitely — paste a post link and choose the image option to download photos, including multi-image carousels.",
      },
    ],
  },
  {
    slug: "facebook-downloader",
    platformId: "facebook",
    platform: "Facebook",
    name: "Facebook Downloader",
    gradient: "from-blue-500 to-blue-700",
    tagline: "Download Facebook videos, Reels & images",
    h1: "Facebook Video Downloader",
    subtitle:
      "Save Facebook videos, Reels and images in HD or SD. Works with posts, watch videos and stories — fast and free.",
    description:
      "Free Facebook video downloader. Save Facebook videos, Reels and images in HD or SD to MP4. No app, no sign-up, no watermark.",
    keywords: [
      "facebook downloader",
      "facebook video downloader",
      "download facebook video",
      "facebook reels downloader",
      "fb video download",
    ],
    placeholder: "https://www.facebook.com/watch?v=…",
    capabilities: ["Videos", "Reels", "Images", "HD & SD"],
    faq: [
      {
        q: "How do I download a Facebook video?",
        a: "Copy the video's link from Facebook, paste it into the box above and click Download. Pick HD or SD quality.",
      },
      {
        q: "Can I download Facebook Reels?",
        a: "Yes, paste any Facebook Reel link and download it as an MP4 with no watermark.",
      },
      {
        q: "Do I need to log in?",
        a: "No login is required for public Facebook videos and Reels.",
      },
    ],
  },
  {
    slug: "twitter-downloader",
    platformId: "x",
    platform: "X (Twitter)",
    name: "X / Twitter Downloader",
    gradient: "from-neutral-700 to-neutral-900",
    tagline: "Download X (Twitter) videos & GIFs",
    h1: "X (Twitter) Video Downloader",
    subtitle:
      "Save videos and GIFs from X (formerly Twitter) in the highest available quality. Fast, free and watermark-free.",
    description:
      "Free X (Twitter) video downloader. Save Twitter videos and GIFs in HD to MP4. No app, no sign-up, no watermark.",
    keywords: [
      "twitter downloader",
      "x video downloader",
      "download twitter video",
      "twitter gif download",
      "save x video",
    ],
    placeholder: "https://x.com/user/status/…",
    capabilities: ["Videos", "GIFs", "HD quality", "Fast & free"],
    faq: [
      {
        q: "How do I download a video from X (Twitter)?",
        a: "Copy the link to the post containing the video, paste it above and click Download.",
      },
      {
        q: "Can I download Twitter GIFs?",
        a: "Yes, GIFs are downloaded as MP4 video files in the best available quality.",
      },
    ],
  },
  {
    slug: "video-downloader",
    platformId: "all-in-one",
    platform: "All-in-One",
    name: "All-in-one Downloader",
    gradient: "from-primary to-accent",
    tagline: "Download from 1000+ websites",
    h1: "All-in-One Video Downloader",
    subtitle:
      "One tool for every platform — paste a link from any supported site and download video, image or audio in seconds.",
    description:
      "Free all-in-one video downloader supporting 1000+ sites including YouTube, TikTok, Instagram, Facebook, X, Pinterest, Vimeo and Dailymotion.",
    keywords: [
      "video downloader",
      "online video downloader",
      "all in one downloader",
      "free video downloader",
      "download any video",
    ],
    placeholder: "Paste any video, image or audio link…",
    capabilities: ["1000+ sites", "Video, image & audio", "Up to 4K", "No watermark"],
    faq: [
      {
        q: "Which websites are supported?",
        a: "DownloadHub Pro works with over 1000 sites, including YouTube, TikTok, Instagram, Facebook, X, Pinterest, Vimeo and Dailymotion.",
      },
      {
        q: "Is there a download limit?",
        a: "Free users get a generous daily limit. Upgrade to Pro or Business for unlimited downloads and higher quality.",
      },
      {
        q: "Do you keep my files?",
        a: "No. Files are processed on demand and automatically deleted right after they are served to you.",
      },
    ],
  },
];

/** Platform-specific tools (excludes all-in-one). */
export const PLATFORM_TOOLS = TOOLS.filter((t) => t.platformId !== "all-in-one");

export function getTool(slug: string): Tool | undefined {
  return TOOLS.find((t) => t.slug === slug);
}
