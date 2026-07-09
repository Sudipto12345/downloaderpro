import { useEffect, useState } from "react";
import { Navigate, useLocation, useParams } from "react-router-dom";
import { DownloaderTool } from "@/components/DownloaderTool";
import { Faq } from "@/components/Faq";
import { HowItWorks } from "@/components/HowItWorks";
import { Seo } from "@/components/Seo";
import { ToolsGrid } from "@/components/ToolsGrid";
import { ContentPage } from "@/pages/ContentPage";
import { useSite } from "@/lib/ConfigContext";
import { fetchCmsPage, type CmsPage } from "@/lib/db";
import { getTool } from "@/data/tools";

export function ToolPage() {
  const { slug: paramSlug = "" } = useParams();
  const { pathname } = useLocation();
  const slug = paramSlug || pathname.replace(/^\//, "");
  const site = useSite();
  const tool = getTool(slug);

  const [cmsPage, setCmsPage] = useState<CmsPage | null>(null);
  const [cmsLoading, setCmsLoading] = useState(!tool);
  const [cmsNotFound, setCmsNotFound] = useState(false);

  useEffect(() => {
    if (tool) return;
    let cancelled = false;
    setCmsLoading(true);
    fetchCmsPage(slug)
      .then((page) => {
        if (!cancelled) {
          setCmsPage(page);
          setCmsNotFound(false);
        }
      })
      .catch(() => {
        if (!cancelled) setCmsNotFound(true);
      })
      .finally(() => {
        if (!cancelled) setCmsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [slug, tool]);

  if (tool) {
    const path = `/${tool.slug}`;
    const jsonLd = [
      {
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        name: tool.name,
        applicationCategory: "MultimediaApplication",
        operatingSystem: "Web",
        offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
        description: tool.description,
        url: `${site.url}${path}`,
      },
    ];

    return (
      <>
        <Seo
          title={tool.name}
          description={tool.description}
          path={path}
          keywords={tool.keywords}
          jsonLd={jsonLd}
        />
        <DownloaderTool tool={tool} compact />
        <HowItWorks />
        <Faq items={tool.faq} title={`${tool.platform} downloader — FAQ`} />
        <ToolsGrid heading="More downloaders" subheading="Save from your other favourite platforms." exclude={tool.slug} />
      </>
    );
  }

  if (cmsLoading) {
    return (
      <div className="grid min-h-[40vh] place-items-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (cmsNotFound || !cmsPage) {
    return <Navigate to="/404" replace />;
  }

  const allInOne = getTool("video-downloader")!;

  return (
    <>
      {cmsPage.showDownloadBar && (
        <DownloaderTool tool={{ ...allInOne, h1: cmsPage.title }} compact />
      )}
      <ContentPage
        title={cmsPage.title}
        description={cmsPage.metaDescription}
        path={`/${cmsPage.slug}`}
        intro={cmsPage.intro}
        sections={cmsPage.sections}
        keywords={cmsPage.keywords}
      />
    </>
  );
}
