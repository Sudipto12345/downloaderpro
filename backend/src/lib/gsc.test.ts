import assert from "node:assert/strict";
import { normalizeGscPayload } from "./gsc.js";

const normalized = normalizeGscPayload({
  verificationContent: "   ",
  propertyUrl: "",
  googleAnalyticsId: "   ",
  customHeadHtml: "   ",
});

assert.deepEqual(normalized, {
  verificationContent: undefined,
  propertyUrl: undefined,
  googleAnalyticsId: undefined,
  customHeadHtml: undefined,
});

console.log("normalizeGscPayload passes");
