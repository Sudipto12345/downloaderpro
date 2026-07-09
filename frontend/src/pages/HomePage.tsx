import { DownloaderTool } from "@/components/DownloaderTool";
import { Features } from "@/components/Features";
import { HowItWorks } from "@/components/HowItWorks";
import { Pricing } from "@/components/Pricing";
import { Seo } from "@/components/Seo";
import { ToolsGrid } from "@/components/ToolsGrid";
import { useConfig, useFlags } from "@/lib/ConfigContext";
import { getTool } from "@/data/tools";

export function HomePage() {
  const allInOne = getTool("video-downloader")!;
  const { config } = useConfig();
  const flags = useFlags();
  const site = config.site;

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: site.name,
      url: site.url,
    },
  ];

  return (
    <>
      <Seo
        title={config.seoDefaults.defaultTitle}
        description={config.seoDefaults.defaultDescription}
        path="/"
        keywords={config.seoDefaults.defaultKeywords}
        jsonLd={jsonLd}
      />
      <DownloaderTool tool={{ ...allInOne, h1: "Download Video, Audio & Images" }} />
      <HowItWorks />
      <ToolsGrid />
      <Features />
      {flags.publicPricing && <Pricing />}
    </>
  );
}
