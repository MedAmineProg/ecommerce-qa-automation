import { pushResultsToSquashTm } from "../api-client";
import { SquashExecutionRow } from "../types";

function row(overrides: Partial<SquashExecutionRow> = {}): SquashExecutionRow {
  return {
    testCaseReference: "TC-101",
    testCaseName: "[TC-101] example",
    status: "SUCCESS",
    executionDate: "2026-01-01T00:00:00.000Z",
    durationMs: 1000,
    comment: "",
    ...overrides,
  };
}

describe("pushResultsToSquashTm", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it("sends a Bearer-authenticated POST to /import/results/{iterationId} without failure_details", async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      status: 204,
      statusText: "No Content",
      json: async () => ({}),
      text: async () => "",
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    await pushResultsToSquashTm([row()], {
      baseUrl: "http://localhost:8090/squash",
      apiToken: "the-token",
      iterationId: 7,
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("http://localhost:8090/squash/api/rest/latest/import/results/7");
    expect(init.headers.Authorization).toBe("Bearer the-token");
    const body = JSON.parse(init.body);
    expect(body).toEqual({
      tests: [{ reference: "TC-101", status: "SUCCESS", duration: 1000 }],
    });
    // Deliberately never sent — Premium/Ultimate-only field, see README.
    expect(body.tests[0]).not.toHaveProperty("failure_details");
  });

  it("reports all rows imported on 204 No Content", async () => {
    global.fetch = jest.fn().mockResolvedValue({ status: 204 }) as unknown as typeof fetch;

    const outcome = await pushResultsToSquashTm([row(), row({ testCaseReference: "TC-102" })], {
      baseUrl: "http://localhost:8090/squash",
      apiToken: "t",
      iterationId: 1,
    });

    expect(outcome).toEqual({ imported: 2, failed: [] });
  });

  it("splits imported vs per-test failures on 207 Multi-Status", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      status: 207,
      json: async () => ({
        iteration_id: 1,
        tests: [
          { test_case_id: 1, reference: "TC-101" },
          {
            test_case_id: 2,
            reference: "TC-102",
            error: "Test with reference TC-102 and an empty dataset not found in iteration X",
          },
        ],
      }),
    }) as unknown as typeof fetch;

    const outcome = await pushResultsToSquashTm([row(), row({ testCaseReference: "TC-102" })], {
      baseUrl: "http://localhost:8090/squash",
      apiToken: "t",
      iterationId: 1,
    });

    expect(outcome.imported).toBe(1);
    expect(outcome.failed).toEqual([
      { reference: "TC-102", error: "Test with reference TC-102 and an empty dataset not found in iteration X" },
    ]);
  });

  it("throws with a clear message on an unexpected HTTP status", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      status: 401,
      statusText: "Unauthorized",
      text: async () => "Full authentication is required",
    }) as unknown as typeof fetch;

    await expect(
      pushResultsToSquashTm([row()], {
        baseUrl: "http://localhost:8090/squash",
        apiToken: "bad-token",
        iterationId: 1,
      })
    ).rejects.toThrow(/HTTP 401 Unauthorized.*Full authentication is required/s);
  });
});
