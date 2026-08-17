#!/usr/bin/env node
import { readFileSync, writeFileSync } from "fs";
import { flattenReport } from "./parser";
import { mapToSquashRows } from "./mapper";
import { toCsv } from "./csv-writer";
import { PlaywrightReport } from "./types";

function main() {
  const [, , inputPath, outputPath] = process.argv;

  if (!inputPath || !outputPath) {
    console.error(
      "Usage: squashtm-exporter <playwright-report.json> <squashtm-import.csv>"
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
}

main();
