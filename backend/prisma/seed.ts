import bcrypt from "bcryptjs";
import { AdPlacement, MenuType, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const MAIN_ADMIN_EMAIL = "smarnobbd@gmail.com";

const LEGACY_ADMIN_EMAILS = [
  "admin@downloadhub.com",
  "admin@downloaderpro.com",
  "admin@downloadhubpro.com",
];

async function upsertUser(opts: {
  name: string;
  email: string;
  password: string;
  role: "admin" | "user";
  planId: "free" | "pro" | "business";
  isSuperAdmin?: boolean;
}) {
  const passwordHash = await bcrypt.hash(opts.password, 10);
  await prisma.user.upsert({
    where: { email: opts.email },
    create: {
      name: opts.name,
      email: opts.email,
      passwordHash,
      role: opts.role,
      planId: opts.planId,
      isSuperAdmin: opts.isSuperAdmin ?? false,
    },
    update: {
      role: opts.role,
      isSuperAdmin: opts.isSuperAdmin ?? false,
    },
  });
  console.log(`  • user: ${opts.email} (${opts.role}${opts.isSuperAdmin ? ", super-admin" : ""})`);
}

async function seedSettings() {
  const settings: { key: string; value: unknown }[] = [
    {
      key: "flags",
      value: {
        publicAccounts: false,
        publicPricing: false,
        publicDashboard: false,
      },
    },
    {
      key: "site",
      value: {
        name: "TinyDown",
        shortName: "TinyDown",
        url: "https://tinydown.com",
        description:
          "Download videos, reels, shorts, stories, images and audio from YouTube, TikTok, Instagram, Facebook and more.",
        twitter: "@tinydown",
        ogImage: "/og-image.png",
        locale: "en_US",
        logoUrl: "",
        faviconUrl: "",
      },
    },
    {
      key: "seo",
      value: {
        defaultTitle: "DownloadHub Pro — Download Video, Image & Audio",
        defaultDescription:
          "Download videos, reels, shorts, stories, images and audio from YouTube, TikTok, Instagram, Facebook and 1000+ sites.",
        defaultKeywords: ["video downloader", "youtube downloader", "tiktok downloader", "instagram downloader"],
      },
    },
    { key: "totalDownloads", value: 0 },
    { key: "totalPageViews", value: 0 },
    { key: "totalAdClicks", value: 0 },
    { key: "totalAdImpressions", value: 0 },
    { key: "adPlacementStats", value: {} },
    {
      key: "theme",
      value: {
        downloadButtonBg: "hsl(233.5, 100%, 48.8%)",
        downloadButtonText: "#ffffff",
        heroGradientFrom: "hsl(261.8, 100%, 37.3%)",
        heroGradientTo: "hsl(303.8, 100%, 50%)",
        navbarTitleColor: "",
        navbarSuffixText: "Pro",
        navbarSuffixUseGradient: true,
        navbarLogoSizePx: 36,
        heroTitleColor: "#ffffff",
        heroSubtitleColor: "rgba(255,255,255,0.85)",
      },
    },
    {
      key: "siteControls",
      value: {
        siteOnline: true,
        downloadToolEnabled: true,
        maintenanceMessage: "We are performing maintenance. Please check back soon.",
      },
    },
    {
      key: "gsc",
      value: {
        verificationContent: "448f8b1b498e3e5b",
        propertyUrl: "https://tinydown.com/",
        googleAnalyticsId: "",
        lastSitemapPingAt: null,
      },
    },
  ];

  for (const s of settings) {
    await prisma.setting.upsert({
      where: { key: s.key },
      create: { key: s.key, value: s.value as object },
      update: {},
    });
  }
  console.log("  • settings seeded");
}

async function seedAdSlots() {
  const placements = Object.values(AdPlacement);
  for (const placement of placements) {
    await prisma.adSlot.upsert({
      where: { placement },
      create: { placement, enabled: false, code: "" },
      update: {},
    });
  }
  console.log(`  • ${placements.length} ad slots seeded`);
}

async function seedMenus() {
  const existing = await prisma.menuItem.count();
  if (existing > 0) {
    console.log("  • menus already exist, skipping");
    return;
  }

  const header: { label: string; href: string; order: number }[] = [
    { label: "All-in-One", href: "/", order: 0 },
    { label: "YouTube", href: "/youtube-downloader", order: 1 },
    { label: "TikTok", href: "/tiktok-downloader", order: 2 },
    { label: "Instagram", href: "/instagram-downloader", order: 3 },
    { label: "Facebook", href: "/facebook-downloader", order: 4 },
    { label: "X / Twitter", href: "/twitter-downloader", order: 5 },
  ];

  for (const item of header) {
    await prisma.menuItem.create({
      data: { menu: MenuType.header, label: item.label, href: item.href, order: item.order },
    });
  }

  const footer: { label: string; href: string; column: number; order: number }[] = [
    { label: "All tools", href: "/tools", column: 1, order: 0 },
    { label: "How it works", href: "/#how", column: 1, order: 1 },
    { label: "About", href: "/about", column: 2, order: 0 },
    { label: "Contact", href: "/contact", column: 2, order: 1 },
    { label: "FAQ", href: "/faq", column: 2, order: 2 },
    { label: "Privacy", href: "/privacy", column: 3, order: 0 },
    { label: "Terms", href: "/terms", column: 3, order: 1 },
    { label: "Disclaimer", href: "/disclaimer", column: 3, order: 2 },
  ];

  for (const item of footer) {
    await prisma.menuItem.create({
      data: {
        menu: MenuType.footer,
        label: item.label,
        href: item.href,
        column: item.column,
        order: item.order,
      },
    });
  }
  console.log("  • header + footer menus seeded");
}

async function seedPages() {
  const pages = [
    {
      slug: "about",
      title: "About DownloadHub Pro",
      metaDescription: "Learn about DownloadHub Pro — the fast, free way to download videos and audio.",
      intro: "DownloadHub Pro is a modern media downloader built to make saving content effortless.",
      sections: [
        { heading: "Our mission", body: "We believe saving the media you love should be simple, fast and respectful of your privacy." },
        { heading: "Built for everyone", body: "Whether you are a creator, student, or casual viewer, DownloadHub Pro adapts to your needs." },
        { heading: "Privacy first", body: "No account required. Files are automatically removed after they are served to you." },
      ],
      navLabel: "About",
      order: 0,
    },
    {
      slug: "contact",
      title: "Contact Us",
      metaDescription: "Get in touch with the DownloadHub Pro team.",
      intro: "Have a question or found a bug? We'd love to hear from you.",
      sections: [
        { heading: "Support", body: "Email support@tinydown.com and we'll get back to you as soon as possible." },
      ],
      navLabel: "Contact",
      order: 1,
    },
    {
      slug: "privacy",
      title: "Privacy Policy",
      metaDescription: "How DownloadHub Pro collects, uses and protects your information.",
      intro: "Your privacy matters. This policy explains what information we handle.",
      sections: [
        { heading: "Information we process", body: "We temporarily process the URL you submit to perform downloads." },
        { heading: "File handling", body: "Downloaded files are deleted from our servers shortly after delivery." },
      ],
      navLabel: "Privacy",
      order: 2,
    },
    {
      slug: "terms",
      title: "Terms of Service",
      metaDescription: "The terms and conditions for using DownloadHub Pro.",
      intro: "By using DownloadHub Pro you agree to the following terms.",
      sections: [
        { heading: "Acceptable use", body: "Download content you own or have the right to download." },
        { heading: "No warranty", body: "The service is provided as-is without warranties." },
      ],
      navLabel: "Terms",
      order: 3,
    },
    {
      slug: "faq",
      title: "FAQ",
      metaDescription: "Frequently asked questions about DownloadHub Pro.",
      intro: "Answers to common questions about downloading videos and audio.",
      sections: [
        { heading: "Do I need an account?", body: "No. Paste a link and download — no sign-up required." },
        { heading: "Is it free?", body: "Yes. Standard downloads are free." },
      ],
      navLabel: "FAQ",
      order: 4,
    },
    {
      slug: "disclaimer",
      title: "Disclaimer",
      metaDescription: "Disclaimer for DownloadHub Pro.",
      intro: "Important information about using this service.",
      sections: [
        { heading: "Copyright", body: "You are responsible for complying with copyright and platform terms." },
      ],
      navLabel: "Disclaimer",
      order: 5,
    },
  ];

  for (const p of pages) {
    await prisma.page.upsert({
      where: { slug: p.slug },
      create: {
        slug: p.slug,
        title: p.title,
        metaDescription: p.metaDescription,
        intro: p.intro,
        sections: p.sections,
        showDownloadBar: false,
        published: true,
        navLabel: p.navLabel,
        order: p.order,
      },
      update: {},
    });
  }
  console.log(`  • ${pages.length} CMS pages seeded`);
}

async function main() {
  console.log("Seeding database…");

  const removed = await prisma.user.deleteMany({
    where: { email: { in: LEGACY_ADMIN_EMAILS } },
  });
  if (removed.count) {
    console.log(`  • removed ${removed.count} legacy admin account(s)`);
  }

  await upsertUser({
    name: "Main Admin",
    email: MAIN_ADMIN_EMAIL,
    password: "Admin123",
    role: "admin",
    planId: "business",
    isSuperAdmin: true,
  });
  await upsertUser({
    name: "Demo User",
    email: "user@downloadhub.com",
    password: "user123",
    role: "user",
    planId: "free",
  });
  await seedSettings();
  await seedAdSlots();
  await seedMenus();
  await seedPages();
  await prisma.setting.upsert({
    where: { key: "ytdlpGeo" },
    create: {
      key: "ytdlpGeo",
      value: {
        geoBypass: true,
        defaultCountry: "BD",
        proxy: "",
        cookiesFile: "",
        countryProxies: [
          { country: "BD", label: "Bangladesh", proxy: "", enabled: true },
          { country: "US", label: "United States", proxy: "", enabled: true },
          { country: "GB", label: "United Kingdom", proxy: "", enabled: true },
          { country: "IN", label: "India", proxy: "", enabled: true },
          { country: "PK", label: "Pakistan", proxy: "", enabled: true },
          { country: "DE", label: "Germany", proxy: "", enabled: true },
        ],
      },
    },
    update: {},
  });
  console.log("  • ytdlp geo config seeded");
  console.log("Seed complete.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
