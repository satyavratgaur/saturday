// Usage: node scripts/seed.mjs   (needs NEXT_PUBLIC_CONVEX_URL in .env.local)
import { readFileSync } from "node:fs";
import { ConvexHttpClient } from "convex/browser";

const env = readFileSync(".env.local", "utf8");
const url = env.match(/NEXT_PUBLIC_CONVEX_URL=(.+)/)?.[1]?.trim();
if (!url) throw new Error("NEXT_PUBLIC_CONVEX_URL missing in .env.local — run `npx convex dev` first");
const cards = JSON.parse(readFileSync("cards.json", "utf8"));
const client = new ConvexHttpClient(url);
const res = await client.mutation("cards:seed", { cards });
console.log("seeded", res);
