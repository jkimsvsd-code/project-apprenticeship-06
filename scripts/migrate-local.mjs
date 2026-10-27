import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
const hosting = JSON.parse(readFileSync(".openai/hosting.json", "utf8"));
if (hosting.d1 !== "DB") throw new Error("Expected the DB binding.");
mkdirSync(".sites-runtime", { recursive: true });
const config = {
  name: "pds-local-migrations",
  compatibility_date: "2026-05-15",
  d1_databases: [
    {
      binding: "DB",
      database_name: "site-creator-d1",
      database_id: "00000000-0000-4000-8000-000000000000",
      migrations_dir: resolve("drizzle"),
    },
  ],
};
const path = ".sites-runtime/local-migrations.json";
writeFileSync(path, JSON.stringify(config, null, 2));
const args = [
  "--import",
  "./scripts/sites-env.mjs",
  "./node_modules/wrangler/bin/wrangler.js",
  "d1",
  "migrations",
  "apply",
  "DB",
  "--local",
  "--config",
  path,
  "--persist-to",
  ".wrangler/state",
];
const result = spawnSync(process.execPath, args, {
  stdio: ["pipe", "inherit", "inherit"],
  input: "y\n",
});
process.exit(result.status ?? 1);
