// Local run: reads ../.env if present, fills in safe local defaults, then starts the service.
// Uses an embedded database in server/.localdb unless DATABASE_URL is set.
import { readFileSync, existsSync } from "node:fs";
const file = new URL("../.env", import.meta.url);
if (existsSync(file)) {
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && m[2] !== "" && process.env[m[1]] === undefined) process.env[m[1]] = m[2];
  }
}
process.env.DATABASE_URL ||= "pglite:" + new URL("./.localdb", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
process.env.PORT ||= "3001";
process.env.IP_SALT ||= "local-dev-only";
process.env.PAYPAL_ENV ||= "mock";
await import("./sync-data.mjs");
await import("./index.js");
