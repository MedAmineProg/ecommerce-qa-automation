import { config } from "./config";
import { FlatTestResult } from "./parser";
import { SquashExecutionRow } from "./types";

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
    comment: r.errorMessage ? r.errorMessage.slice(0, 500) : "",
  }));
}
