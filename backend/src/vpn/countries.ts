import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import type { CountryDefinition } from "./types.js";

const DEFAULT_COUNTRIES: CountryDefinition[] = [
  { code: "BD", name: "Bangladesh" },
  { code: "US", name: "United States", aliases: ["USA"] },
  { code: "GB", name: "United Kingdom", aliases: ["UK"] },
  { code: "SG", name: "Singapore" },
  { code: "JP", name: "Japan" },
  { code: "KR", name: "South Korea" },
  { code: "IN", name: "India" },
  { code: "MY", name: "Malaysia" },
  { code: "TH", name: "Thailand" },
  { code: "VN", name: "Vietnam" },
  { code: "HK", name: "Hong Kong" },
  { code: "AE", name: "United Arab Emirates" },
  { code: "SA", name: "Saudi Arabia" },
  { code: "QA", name: "Qatar" },
  { code: "TR", name: "Turkey" },
  { code: "DE", name: "Germany" },
  { code: "FR", name: "France" },
  { code: "IT", name: "Italy" },
  { code: "ES", name: "Spain" },
  { code: "NL", name: "Netherlands" },
  { code: "SE", name: "Sweden" },
  { code: "NO", name: "Norway" },
  { code: "CH", name: "Switzerland" },
  { code: "CA", name: "Canada" },
  { code: "MX", name: "Mexico" },
  { code: "AU", name: "Australia" },
  { code: "NZ", name: "New Zealand" },
  { code: "BR", name: "Brazil" },
  { code: "AR", name: "Argentina" },
  { code: "ZA", name: "South Africa" },
  { code: "NG", name: "Nigeria" },
  { code: "KE", name: "Kenya" },
  { code: "PL", name: "Poland" },
  { code: "CZ", name: "Czech Republic" },
  { code: "AT", name: "Austria" },
  { code: "BE", name: "Belgium" },
  { code: "DK", name: "Denmark" },
  { code: "FI", name: "Finland" },
  { code: "IE", name: "Ireland" },
  { code: "PT", name: "Portugal" },
  { code: "RO", name: "Romania" },
  { code: "HU", name: "Hungary" },
  { code: "GR", name: "Greece" },
  { code: "RU", name: "Russia" },
  { code: "UA", name: "Ukraine" },
];

let cache: CountryDefinition[] | null = null;

function loadCountriesFile(): CountryDefinition[] | null {
  const paths = [
    process.env.VPN_COUNTRIES_FILE,
    "/etc/downloaderpro/countries.json",
    resolve(process.cwd(), "../ops/config/countries.json"),
    resolve(process.cwd(), "ops/config/countries.json"),
  ].filter(Boolean) as string[];

  for (const p of paths) {
    if (existsSync(p)) {
      try {
        const data = JSON.parse(readFileSync(p, "utf8"));
        return Array.isArray(data.countries) ? data.countries : data;
      } catch {
        /* try next */
      }
    }
  }
  return null;
}

export function getCountryDefinitions(): CountryDefinition[] {
  if (cache) return cache;
  cache = loadCountriesFile() ?? DEFAULT_COUNTRIES;
  return cache;
}

/** Normalize country input (UK → GB, usa → US). */
export function normalizeCountryCode(input: string): string {
  const raw = input.trim().toUpperCase();
  if (!raw) return "";
  for (const c of getCountryDefinitions()) {
    if (c.code === raw) return c.code;
    if (c.aliases?.some((a) => a.toUpperCase() === raw)) return c.code;
    if (c.name.toUpperCase() === raw) return c.code;
  }
  return raw.length === 2 ? raw : raw;
}

export function isSupportedCountry(code: string): boolean {
  const norm = normalizeCountryCode(code);
  return getCountryDefinitions().some((c) => c.code === norm);
}
