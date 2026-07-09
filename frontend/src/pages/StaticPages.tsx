import { SITE } from "@/data/site";
import { ContentPage } from "./ContentPage";

export function AboutPage() {
  return (
    <ContentPage
      title="About DownloadHub Pro"
      description={`Learn about ${SITE.name} — the fast, free and private way to download videos, images and audio from your favourite platforms.`}
      path="/about"
      intro="DownloadHub Pro is a modern media downloader built to make saving content effortless. Paste a link, pick a quality and download — that's it."
      sections={[
        {
          heading: "Our mission",
          body: "We believe saving the media you love should be simple, fast and respectful of your privacy. No clutter, no endless redirects, no watermarks — just a clean tool that works across 1000+ platforms.",
        },
        {
          heading: "Built for everyone",
          body: "Whether you are a creator repurposing content, a student saving lectures, or just keeping a favourite clip, DownloadHub Pro adapts to your needs with dedicated tools for each platform.",
        },
        {
          heading: "Privacy first",
          body: "We don't require an account for standard downloads, we don't track your activity, and files are automatically removed right after they are served to you.",
        },
      ]}
    />
  );
}

export function ContactPage() {
  return (
    <ContentPage
      title="Contact Us"
      description={`Get in touch with the ${SITE.name} team for support, feedback or partnership enquiries.`}
      path="/contact"
      intro="Have a question, found a bug, or want to partner with us? We'd love to hear from you."
      sections={[
        {
          heading: "Support",
          body: "For help with a download or your account, email support@downloadhubpro.com and we'll get back to you as soon as possible.",
        },
        {
          heading: "Business & partnerships",
          body: "For partnership, advertising or press enquiries, reach out to hello@downloadhubpro.com.",
        },
      ]}
    />
  );
}

export function PrivacyPage() {
  return (
    <ContentPage
      title="Privacy Policy"
      description={`How ${SITE.name} collects, uses and protects your information.`}
      path="/privacy"
      intro="Your privacy matters. This policy explains what information we handle and how we protect it."
      sections={[
        {
          heading: "Information we process",
          body: "To perform a download we temporarily process the URL you submit. We do not require personal information for standard downloads.",
        },
        {
          heading: "File handling",
          body: "Downloaded files are processed on demand and automatically deleted from our servers shortly after they are delivered to you.",
        },
        {
          heading: "Cookies & analytics",
          body: "We may use minimal, privacy-respecting analytics to understand aggregate usage and improve the service. We do not sell your data.",
        },
        {
          heading: "Your rights",
          body: "You can contact us at any time to ask questions about your data or request its deletion.",
        },
      ]}
    />
  );
}

export function TermsPage() {
  return (
    <ContentPage
      title="Terms of Service"
      description={`The terms and conditions for using ${SITE.name}.`}
      path="/terms"
      intro="By using DownloadHub Pro you agree to the following terms."
      sections={[
        {
          heading: "Acceptable use",
          body: "DownloadHub Pro is intended for downloading content you own or have the right to download. You are responsible for complying with the rights of content owners and the terms of the source platforms.",
        },
        {
          heading: "No warranty",
          body: "The service is provided 'as is' without warranties of any kind. Availability of specific sites or formats may change over time.",
        },
        {
          heading: "Limitation of liability",
          body: "We are not liable for how downloaded content is used. Always respect copyright and applicable laws in your country.",
        },
      ]}
    />
  );
}
