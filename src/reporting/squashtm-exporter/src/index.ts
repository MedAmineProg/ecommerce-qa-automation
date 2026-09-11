#!/usr/bin/env node
import * as dotenv from "dotenv";
import { readFileSync, writeFileSync } from "fs";
import { flattenReport } from "./parser";
import { mapToSquashRows } from "./mapper";
import { toCsv } from "./csv-writer";
import { pushResultsToSquashTm } from "./api-client";
import { PlaywrightReport } from "./types";

dotenv.config();

async function main() {
  const args = process.argv.slice(2);
  const push = args.includes("--push");
  const [inputPath, outputPath] = args.filter((a) => !a.startsWith("--"));

  if (!inputPath || !outputPath) {
    console.error(
      "Usage: squashtm-exporter <playwright-report.json> <squashtm-import.csv> [--push]"
    );
    process.exit(1);
  }

  const raw = readFileSync(inputPath, "utf-8");
  const report: PlaywrightReport = JSON.parse(raw);

  const flat = flattenReport(report);
  const rows = mapToSquashRows(flat);
  const csv = toCsv(rows);

  writeFileSync(outputPath, csv, "utf-8");

  const unmapped = rows.filter((r) => r.testCaseReference.startsWith("UNMAPPED")).length;
  console.log(`Wrote ${rows.length} execution rows to ${outputPath}`);
  if (unmapped > 0) {
    console.warn(
      `${unmapped} test(s) had no [TC-xxx] reference in their title and were auto-slugged. ` +
        `Adjust config.referencePattern or your test titles if this is unexpected.`
    );
  }

  if (!push) return;

  // --push additionally publishes the same rows live to a real SquashTM
  // instance. CSV output above is unaffected either way — this is strictly
  // additive, never a replacement for it.
  const baseUrl = process.env.SQUASHTM_BASE_URL;
  const apiToken = process.env.SQUASHTM_API_TOKEN;
  const iterationIdRaw = process.env.SQUASHTM_ITERATION_ID;

  if (!baseUrl || !apiToken || !iterationIdRaw) {
    console.error(
      "--push requires SQUASHTM_BASE_URL, SQUASHTM_API_TOKEN, and SQUASHTM_ITERATION_ID " +
        "to be set (environment or .env). See .env.example and this module's README."
    );
    process.exit(1);
  }

  const iterationId = Number(iterationIdRaw);
  if (!Number.isInteger(iterationId) || iterationId <= 0) {
    console.error(`SQUASHTM_ITERATION_ID must be a positive integer — got "${iterationIdRaw}".`);
    process.exit(1);
  }

  console.log(`Pushing ${rows.length} result(s) to ${baseUrl} (iteration ${iterationId})...`);
  try {
    const outcome = await pushResultsToSquashTm(rows, { baseUrl, apiToken, iterationId });
    console.log(`SquashTM accepted ${outcome.imported}/${rows.length} result(s).`);
    if (outcome.failed.length > 0) {
      console.warn(`${outcome.failed.length} result(s) had a per-test error from SquashTM:`);
      for (const f of outcome.failed) {
        console.warn(`  - ${f.reference}: ${f.error}`);
      }
    }
  } catch (err) {
    console.error("Failed to push results to SquashTM:", err instanceof Error ? err.message : err);
    process.exit(1);
  }
}

main();
