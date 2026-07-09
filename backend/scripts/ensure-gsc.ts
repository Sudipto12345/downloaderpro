import { getGscConfig, setSetting } from "../src/lib/settings.js";

const GSC_VERIFICATION_TOKEN = "448f8b1b498e3e5b";

async function main() {
  const current = await getGscConfig();
  const existing = (current.verificationContent ?? "").trim();

  if (existing === GSC_VERIFICATION_TOKEN) {
    console.log(`GSC verification already set (${GSC_VERIFICATION_TOKEN})`);
    return;
  }

  await setSetting("gsc", {
    ...current,
    verificationContent: GSC_VERIFICATION_TOKEN,
    propertyUrl: current.propertyUrl?.trim() || "https://tinydown.com/",
  });
  console.log(`GSC verification token applied: ${GSC_VERIFICATION_TOKEN}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    const { prisma } = await import("../src/db.js");
    await prisma.$disconnect();
  });
