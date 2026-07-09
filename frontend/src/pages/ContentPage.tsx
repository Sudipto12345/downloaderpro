import { Seo } from "@/components/Seo";

interface Section {
  heading?: string;
  body: string;
}

export interface ContentPageProps {
  title: string;
  description: string;
  path: string;
  intro: string;
  sections: Section[];
  keywords?: string[];
}

function looksLikeHtml(value: string): boolean {
  return /<[a-z][\s\S]*>/i.test(value.trim());
}

function RichBlock({ html }: { html: string }) {
  if (!html.trim()) return null;
  if (looksLikeHtml(html)) {
    return <div className="cms-content" dangerouslySetInnerHTML={{ __html: html }} />;
  }
  return <p className="leading-relaxed text-muted-foreground">{html}</p>;
}

export function ContentPage({ title, description, path, intro, sections, keywords }: ContentPageProps) {
  return (
    <>
      <Seo title={title} description={description} path={path} keywords={keywords} />
      <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{title}</h1>
        <div className="mt-4 text-lg">
          <RichBlock html={intro} />
        </div>
        <div className="mt-10 space-y-8">
          {sections.map((s, i) => (
            <section key={i}>
              {s.heading && <h2 className="text-xl font-semibold">{s.heading}</h2>}
              <RichBlock html={s.body} />
            </section>
          ))}
        </div>
      </article>
    </>
  );
}
