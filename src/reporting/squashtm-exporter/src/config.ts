import { PlaywrightStatus, SquashStatus } from "./types";

/**
 * Central place to adapt this exporter to a real SquashTM instance.
 * Nothing else in this module should hardcode column names or status
 * strings — they all read from here.
 */
export const config = {
  /**
   * Convention for turning a Playwright test title into a SquashTM
   * test case reference. Example: a test titled
   * "[TC-042] user can reset password" maps to reference "TC-042".
   * Adjust the regex to match your team's naming convention.
   */
  referencePattern: /\[(TC-\d+)\]/,

  /** Fallback reference prefix when a test title has no explicit TC id */
  unmatchedReferencePrefix: "UNMAPPED",

  /** Maps Playwright's result status vocabulary to SquashTM's */
  statusMap: {
    passed: "SUCCESS",
    failed: "FAILURE",
    timedOut: "FAILURE",
    interrupted: "BLOCKED",
    skipped: "READY",
  } as Record<PlaywrightStatus, SquashStatus>,

  /** Column headers for the CSV import file — match these to your SquashTM import template */
  csvColumns: {
    testCaseReference: "TEST_CASE_REFERENCE",
    testCaseName: "TEST_CASE_NAME",
    status: "STATUS",
    executionDate: "EXECUTION_DATE",
    durationMs: "DURATION_MS",
    comment: "COMMENT",
  },
};
