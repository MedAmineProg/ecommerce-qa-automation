/**
 * Types for converting a Playwright JSON test report into a
 * SquashTM-compatible test execution import file.
 *
 * NOTE: SquashTM's import template (column names/order) can vary by
 * version and by how your instance is configured. Treat `config.ts`
 * as the single place to adjust field names to match your instance —
 * everything downstream reads from that config rather than hardcoding
 * column names.
 */

export type PlaywrightStatus = "passed" | "failed" | "timedOut" | "skipped" | "interrupted";

export interface PlaywrightReport {
  suites: PlaywrightSuite[];
  stats?: {
    startTime?: string;
    duration?: number;
  };
}

export interface PlaywrightSuite {
  title: string;
  suites?: PlaywrightSuite[];
  specs: PlaywrightSpec[];
}

export interface PlaywrightSpec {
  title: string;
  tests: PlaywrightTest[];
}

export interface PlaywrightTest {
  // Note: real Playwright JSON reporter output does not put a title here —
  // only PlaywrightSpec.title carries it. See parser.ts.
  annotations?: { type: string; description?: string }[];
  results: PlaywrightResult[];
}

export interface PlaywrightResult {
  status: PlaywrightStatus;
  duration: number;
  error?: { message?: string };
  startTime?: string;
}

/** SquashTM execution status vocabulary (adjust in config.ts if your instance differs) */
export type SquashStatus = "SUCCESS" | "FAILURE" | "BLOCKED" | "READY" | "SETTLED";

export interface SquashExecutionRow {
  testCaseReference: string;
  testCaseName: string;
  status: SquashStatus;
  executionDate: string; // ISO date
  durationMs: number;
  comment: string;
}
