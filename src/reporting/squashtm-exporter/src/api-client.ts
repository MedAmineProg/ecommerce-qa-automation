import { SquashExecutionRow } from "./types";

export interface SquashTmClientConfig {
  /** e.g. http://localhost:8090/squash (no trailing slash needed) */
  baseUrl: string;
  /**
   * A SquashTM Personal API Token, already decoded to its raw JWT form.
   *
   * SquashTM's "Create API token" UI response wraps the real token in an
   * extra base64 layer (`{"token": "<base64 of the real JWT>"}`). The
   * Bearer header needs the *decoded* JWT, not that wrapper string —
   * verified empirically against a live instance: the wrapped value gets a
   * 401, the decoded JWT gets a 200. See this module's README for the full
   * verification writeup and how to mint one.
   */
  apiToken: string;
  /** The target iteration's numeric id — every referenced test case must already be in its test plan. */
  iterationId: number;
}

interface ImportResultsResponseTest {
  test_case_id?: number;
  reference: string;
  error?: string;
}

interface ImportResultsResponse {
  iteration_id: number;
  tests: ImportResultsResponseTest[];
}

export interface SquashTmPushOutcome {
  /** How many of the submitted rows SquashTM accepted with no per-test error. */
  imported: number;
  /** Rows SquashTM accepted the request for but flagged with a per-test error (e.g. a licensing restriction). */
  failed: { reference: string; error: string }[];
}

/**
 * Pushes already-mapped execution rows to a real SquashTM instance via
 * POST /api/rest/latest/import/results/{iteration_id} — the current,
 * supported mechanism for publishing automated results (the
 * `automation.result.publisher.community` plugin this module was
 * originally asked to target was removed from SquashTM at version 6.0.0;
 * see the README for how that was confirmed).
 *
 * Deliberately omits `failure_details`: that field is Premium/Ultimate-only
 * in SquashTM's licensing — sending it against a Community edition instance
 * makes the whole request fail per-test with a licensing error (confirmed
 * empirically, HTTP 207 with "Adding failure details is only available for
 * SquashTM Premium or Ultimate licenses."). Status and duration alone are
 * enough to update execution status, which is this module's actual job.
 */
export async function pushResultsToSquashTm(
  rows: SquashExecutionRow[],
  config: SquashTmClientConfig
): Promise<SquashTmPushOutcome> {
  const url = `${config.baseUrl.replace(/\/+$/, "")}/api/rest/latest/import/results/${config.iterationId}`;

  const body = {
    tests: rows.map((r) => ({
      reference: r.testCaseReference,
      status: r.status,
      duration: r.durationMs,
    })),
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiToken}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
  });

  // 204: every row imported clean, no response body.
  if (response.status === 204) {
    return { imported: rows.length, failed: [] };
  }

  // 207: SquashTM accepted the request but one or more rows hit a per-test
  // error (e.g. the licensing restriction above, or a reference that
  // doesn't match any test case in the iteration's test plan).
  if (response.status === 207) {
    const payload = (await response.json()) as ImportResultsResponse;
    const failed = payload.tests
      .filter((t) => t.error)
      .map((t) => ({ reference: t.reference, error: t.error as string }));
    return { imported: rows.length - failed.length, failed };
  }

  const text = await response.text().catch(() => "");
  throw new Error(
    `SquashTM rejected the import request: HTTP ${response.status} ${response.statusText}` +
      (text ? ` — ${text}` : "")
  );
}
