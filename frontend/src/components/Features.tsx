import { Gauge, Image, Layers, Music, ShieldCheck, Video } from "lucide-react";
import { Card } from "@/components/ui/card";

const FEATURES = [
  {
    icon: Gauge,
    title: "Blazing fast",
    desc: "An optimized pipeline pulls media at full speed — no waiting around.",
  },
  {
    icon: Video,
    title: "Up to 4K",
    desc: "Grab any resolution from 144p to crystal-clear 4K, exactly how you want it.",
  },
  {
    icon: ShieldCheck,
    title: "No watermark",
    desc: "Clean downloads every time — no logos stamped over your videos.",
  },
  {
    icon: Layers,
    title: "8+ platforms",
    desc: "YouTube, TikTok, Instagram, Facebook, X, Pinterest, Vimeo and more.",
  },
  {
    icon: Music,
    title: "Video, image & audio",
    desc: "Save full videos, photos and carousels, or extract audio as you like.",
  },
  {
    icon: Image,
    title: "Private & secure",
    desc: "We don't track you, and files are auto-removed right after they're served.",
  },
];

export function Features() {
  return (
    <section id="features" className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-24">
      <div className="text-center">
        <span className="text-sm font-semibold uppercase tracking-widest text-primary">
          Why DownloadHub
        </span>
        <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
          Everything you need to save media
        </h2>
        <p className="mx-auto mt-3 max-w-md text-muted-foreground">
          One simple tool that just works, across all your favourite platforms.
        </p>
      </div>

      <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((f) => (
          <Card key={f.title} className="card-hover p-6">
            <div className="mb-4 grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br from-primary/15 to-accent/15 text-primary">
              <f.icon className="h-5 w-5" />
            </div>
            <h3 className="text-base font-semibold">{f.title}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
          </Card>
        ))}
      </div>
    </section>
  );
}
