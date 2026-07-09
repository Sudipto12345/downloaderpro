import { ClipboardPaste, Download, MousePointerClick } from "lucide-react";

const STEPS = [
  {
    icon: ClipboardPaste,
    title: "Paste the link",
    desc: "Copy any video, reel, post or photo URL and paste it into the box above.",
  },
  {
    icon: MousePointerClick,
    title: "Pick your quality",
    desc: "We instantly fetch the preview. Choose a format — from 144p to crisp 4K, or audio.",
  },
  {
    icon: Download,
    title: "Download instantly",
    desc: "Hit download and your file saves straight to your device. No watermark, no fuss.",
  },
];

export function HowItWorks() {
  return (
    <section id="how" className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-24">
      <div className="text-center">
        <span className="text-sm font-semibold uppercase tracking-widest text-primary">
          Get started
        </span>
        <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
          Three steps. That's it.
        </h2>
        <p className="mx-auto mt-3 max-w-md text-muted-foreground">
          No accounts, no software to install — just paste, pick and save.
        </p>
      </div>

      <div className="relative mt-14 grid gap-6 md:grid-cols-3">
        <div className="absolute left-0 right-0 top-7 hidden h-px bg-gradient-to-r from-transparent via-border to-transparent md:block" />
        {STEPS.map((step, i) => (
          <div key={step.title} className="relative text-center">
            <div className="relative z-10 mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-border bg-card shadow-lg">
              <step.icon className="h-6 w-6 text-primary" />
              <span className="absolute -right-1.5 -top-1.5 grid h-6 w-6 place-items-center rounded-full bg-gradient-to-br from-primary to-accent text-xs font-bold text-white">
                {i + 1}
              </span>
            </div>
            <h3 className="mt-5 text-lg font-semibold">{step.title}</h3>
            <p className="mx-auto mt-2 max-w-xs text-sm text-muted-foreground">{step.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
