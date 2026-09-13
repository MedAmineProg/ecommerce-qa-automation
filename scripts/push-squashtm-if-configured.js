#!/usr/bin/env node
/**
 * Runs as the "posttest" npm lifecycle hook, i.e. automatically right
 * after `npm test` finishes (npm only runs posttest if test itself
 * exited 0 — a red local run never auto-pushes). Purely a local
 * convenience: if SQUASHTM_* env vars are set, push results live;
 * otherwise no-op with a one-line note. Never runs in CI — CI calls
 * `npx playwright test` directly, not `npm test`, so this hook never
 * fires there regardless of env vars.
 *
 * Scoped to chromium's results only. SquashTM's import endpoint rejects
 * a batch containing the same reference more than once (HTTP 412 "the
 * reference and dataset name combination must be unique"), and this
 * repo's full run has every reference 3x, once per browser — see
 * src/reporting/squashtm-exporter/README.md for the full writeup. Until
 * that's fixed properly (see that README), auto-push picks one browser
 * rather than failing outright on every green run.
 */
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const ROOT = path.join(__dirname, "..");
// This runs as its own process (an npm lifecycle hook), so it needs to load
// .env itself — it doesn't inherit anything index.ts's own dotenv.config()
// call picks up later, since that happens in a separate child process.
require("dotenv").config({ path: path.join(ROOT, ".env") });
const { SQUASHTM_BASE_URL, SQUASHTM_API_TOKEN, SQUASHTM_ITERATION_ID } = process.env;

if (!SQUASHTM_BASE_URL || !SQUASHTM_API_TOKEN || !SQUASHTM_ITERATION_ID) {
  console.log(
    "\n(squashtm) SQUASHTM_BASE_URL / SQUASHTM_API_TOKEN / SQUASHTM_ITERATION_ID not all set " +
      "— skipping local auto-push. See .env.example."
  );
  process.exit(0);
}

const reportPath = path.join(ROOT, "playwright-json-report.json");
if (!fs.existsSync(reportPath)) {
  console.warn("(squashtm) playwright-json-report.json not found — skipping auto-push.");
  process.exit(0);
}

function filterToChromium(suite) {
  return {
    ...suite,
    specs: (suite.specs ?? [])
      .map((spec) => ({
        ...spec,
        tests: spec.tests.filter((t) => t.projectName === "chromium"),
      }))
      .filter((spec) => spec.tests.length > 0),
    suites: (suite.suites ?? []).map(filterToChromium),
  };
}

const report = JSON.parse(fs.readFileSync(reportPath, "utf-8"));
const filtered = { ...report, suites: report.suites.map(filterToChromium) };
const filteredPath = path.join(ROOT, "playwright-json-report.chromium.json");
fs.writeFileSync(filteredPath, JSON.stringify(filtered));

console.log("\n(squashtm) SQUASHTM_* env vars detected — auto-pushing chromium's results...");
try {
  execFileSync(
    "npx",
    [
      "ts-node",
      "src/reporting/squashtm-exporter/src/index.ts",
      filteredPath,
      path.join(ROOT, "squashtm-import.csv"),
      "--push",
    ],
    { cwd: ROOT, stdio: "inherit", shell: true }
  );
} finally {
  fs.unlinkSync(filteredPath);
}
