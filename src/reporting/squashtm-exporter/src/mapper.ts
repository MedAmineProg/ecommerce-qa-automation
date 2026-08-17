import { config } from "./config";
import { FlatTestResult } from "./parser";
import { SquashExecutionRow } from "./types";

// Playwright's error messages carry ANSI color codes (e.g. "\x1b[31m") even
// when the reporter output goes to a file rather than a TTY. Left in, they
// show up as garbled control characters in the CSV comment field when
// opened in SquashTM or Excel — defeating the point of a human-readable
// comment for a non-engineer reviewing results.
function stripAnsiCodes(str: string): string {
  // eslint-disable-next-line no-control-regex
  return str.replace(/\x1b\[[0-9;]*m/g, "");
}

function extractReference(title: string): string {
  const match = title.match(config.referencePattern);
  if (match) return match[1];
  // Fall back to a deterministic slug so unmapped tests are still traceable,
  // rather than silently dropped.
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return `${config.unmatchedReferencePrefix}-${slug}`;
}

export function mapToSquashRows(results: FlatTestResult[]): SquashExecutionRow[] {
  return results.map((r) => ({
    testCaseReference: extractReference(r.title),
    testCaseName: r.title,
    status: config.statusMap[r.status] ?? "BLOCKED",
    executionDate: r.startTime ?? new Date().toISOString(),
    durationMs: r.duration,
    comment: r.errorMessage ? stripAnsiCodes(r.errorMessage).slice(0, 500) : "",
  }));
}
