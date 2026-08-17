import { PlaywrightReport, PlaywrightSuite, PlaywrightTest } from "./types";

export interface FlatTestResult {
  title: string;
  status: PlaywrightTest["results"][number]["status"];
  duration: number;
  startTime?: string;
  errorMessage?: string;
}

/**
 * Playwright's JSON reporter output is a tree of suites (which can
 * nest arbitrarily, e.g. file -> describe block -> test). This flattens
 * it into one row per test, taking the *last* retry's result as the
 * final outcome — matching what you'd see in the HTML report.
 */
export function flattenReport(report: PlaywrightReport): FlatTestResult[] {
  const out: FlatTestResult[] = [];

  function walk(suite: PlaywrightSuite) {
    for (const spec of suite.specs ?? []) {
      for (const test of spec.tests) {
        const finalResult = test.results[test.results.length - 1];
        if (!finalResult) continue;
        out.push({
          // Playwright's real JSON reporter output does not put a title on
          // each entry in spec.tests (one per project/retry group) — only
          // spec.title carries it. The sample fixture this module was
          // originally built against duplicated the title onto both,
          // which masked this until run against real report output.
          title: spec.title,
          status: finalResult.status,
          duration: finalResult.duration,
          startTime: finalResult.startTime,
          errorMessage: finalResult.error?.message,
        });
      }
    }
    for (const child of suite.suites ?? []) {
      walk(child);
    }
  }

  for (const suite of report.suites) {
    walk(suite);
  }

  return out;
}
