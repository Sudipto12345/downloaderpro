import { ChevronDown } from "lucide-react";
import { useState } from "react";
import type { FaqItem } from "@/data/tools";
import { cn } from "@/lib/utils";

export function Faq({ items, title = "Frequently asked questions" }: { items: FaqItem[]; title?: string }) {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section id="faq" className="mx-auto max-w-3xl px-4 py-20 sm:px-6 sm:py-24">
      <div className="text-center">
        <span className="text-sm font-semibold uppercase tracking-widest text-primary">FAQ</span>
        <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">{title}</h2>
      </div>

      <div className="mt-10 space-y-3">
        {items.map((item, i) => {
          const isOpen = open === i;
          return (
            <div
              key={item.q}
              className="overflow-hidden rounded-xl border border-border bg-card transition-colors"
            >
              <button
                onClick={() => setOpen(isOpen ? null : i)}
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                aria-expanded={isOpen}
              >
                <span className="font-medium">{item.q}</span>
                <ChevronDown
                  className={cn(
                    "h-5 w-5 shrink-0 text-muted-foreground transition-transform",
                    isOpen && "rotate-180 text-primary"
                  )}
                />
              </button>
              <div
                className={cn(
                  "grid transition-all duration-300",
                  isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                )}
              >
                <div className="overflow-hidden">
                  <p className="px-5 pb-5 text-sm leading-relaxed text-muted-foreground">
                    {item.a}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
