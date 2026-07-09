import { PlatformNav } from "@/components/PlatformNav";
import { Seo } from "@/components/Seo";
import { ToolsGrid } from "@/components/ToolsGrid";
import { SITE } from "@/data/site";

export function ToolsPage() {
  return (
    <>
      <Seo
        title="All Downloader Tools"
        description="Browse every DownloadHub Pro tool — dedicated downloaders for YouTube, TikTok, Instagram, Facebook, X, and 1000+ more sites."
        path="/tools"
        keywords={["video downloader tools", "social media downloader", "download tools"]}
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: "All Downloader Tools",
          url: `${SITE.url}/tools`,
        }}
      />
      <div className="mx-auto max-w-3xl px-4 pt-10 text-center sm:px-6">
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-5xl">
          Every downloader, <span className="gradient-text">one place</span>
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
          Choose a dedicated tool tuned for your platform — or use the all-in-one downloader for
          anything else.
        </p>
        <div className="mx-auto mt-8 max-w-4xl md:hidden">
          <PlatformNav className="justify-center" />
        </div>
      </div>
      <ToolsGrid heading="Choose a platform" subheading="Tap any tool to get started instantly." />
    </>
  );
}
