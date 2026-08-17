import { mapToSquashRows } from "../mapper";
import { FlatTestResult } from "../parser";

describe("mapToSquashRows", () => {
  it("extracts the TC reference from a bracketed test title", () => {
    const input: FlatTestResult[] = [
      { title: "[TC-101] user can log in", status: "passed", duration: 1200 },
    ];
    const [row] = mapToSquashRows(input);
    expect(row.testCaseReference).toBe("TC-101");
    expect(row.status).toBe("SUCCESS");
  });

  it("falls back to a slugged UNMAPPED reference when no TC id is present", () => {
    const input: FlatTestResult[] = [
      { title: "search returns empty state for nonsense query", status: "skipped", duration: 0 },
    ];
    const [row] = mapToSquashRows(input);
    expect(row.testCaseReference).toBe("UNMAPPED-search-returns-empty-state-for-nonsense-query");
    expect(row.status).toBe("READY");
  });

  it("maps failed and timedOut to FAILURE, interrupted to BLOCKED", () => {
    const input: FlatTestResult[] = [
      { title: "[TC-1] a", status: "failed", duration: 10 },
      { title: "[TC-2] b", status: "timedOut", duration: 10 },
      { title: "[TC-3] c", status: "interrupted", duration: 10 },
    ];
    const rows = mapToSquashRows(input);
    expect(rows.map((r) => r.status)).toEqual(["FAILURE", "FAILURE", "BLOCKED"]);
  });

  it("truncates long error messages to keep the comment field import-safe", () => {
    const longMessage = "x".repeat(1000);
    const input: FlatTestResult[] = [
      { title: "[TC-1] a", status: "failed", duration: 10, errorMessage: longMessage },
    ];
    const [row] = mapToSquashRows(input);
    expect(row.comment.length).toBe(500);
  });
});
