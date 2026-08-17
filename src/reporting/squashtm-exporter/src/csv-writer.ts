import { config } from "./config";
import { SquashExecutionRow } from "./types";

function escapeCsvField(value: string | number): string {
  const str = String(value);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function toCsv(rows: SquashExecutionRow[]): string {
  const headers = Object.values(config.csvColumns);
  const lines = [headers.join(",")];

  for (const row of rows) {
    lines.push(
      [
        row.testCaseReference,
        row.testCaseName,
        row.status,
        row.executionDate,
        row.durationMs,
        row.comment,
      ]
        .map(escapeCsvField)
        .join(",")
    );
  }

  return lines.join("\n");
}
