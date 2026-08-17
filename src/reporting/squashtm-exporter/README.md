# SquashTM Test Execution Exporter

Converts a Playwright JSON test report into a CSV file matching SquashTM's
test execution import format — closing the loop between automated test runs
and enterprise test management.

## Why this exists

Most Playwright portfolio projects stop at "tests pass in CI." This module
demonstrates the piece that usually only shows up in real enterprise QA
workflows: getting automated results *into* a test management tool that
non-engineers (QA leads, product owners) actually look at.

## How it works

```
Playwright JSON report
        │
        ▼
  parser.ts     — flattens the nested suite/spec/test tree into one row per test
        │
        ▼
  mapper.ts     — extracts a test case reference (e.g. TC-101) from the title,
        │          maps Playwright's status vocabulary to SquashTM's
        ▼
  csv-writer.ts — serializes rows into a SquashTM-compatible CSV
```

Every SquashTM-specific detail (column names, status vocabulary, reference
naming convention) lives in `config.ts`. Nothing else hardcodes it. This
matters because SquashTM's import schema varies by version and by how an
instance is configured — in a real deployment you point `config.ts` at your
actual template instead of touching the parsing/mapping logic.

## Test case reference convention

Tests are expected to include a bracketed ID in their title:

```ts
test("[TC-101] user can complete checkout with valid payment", async ({ page }) => {
  ...
});
```

Tests without a `[TC-xxx]` tag aren't dropped — they get a deterministic
`UNMAPPED-<slug>` reference so they still show up in the import and can be
triaged, rather than silently disappearing from the report.

## Usage

```bash
# 1. Run your suite with the JSON reporter
npx playwright test --reporter=json > report.json

# 2. Convert to a SquashTM import file
npx ts-node src/index.ts report.json squashtm-import.csv
```

## Try it against the sample fixture

```bash
npx ts-node src/index.ts fixtures/sample-playwright-report.json out.csv
cat out.csv
```

## Tests

```bash
npx jest src/__tests__/mapper.test.ts
```

## Adapting this to a real SquashTM instance

1. Confirm your instance's actual import template (Test Plan → Execute →
   Import, or via the SquashTM REST API if your version exposes one).
2. Update `csvColumns` in `config.ts` to match those exact column headers.
3. Update `statusMap` if your instance uses different status codes.
4. If your team uses a different test-ID convention than `[TC-xxx]`, update
   `referencePattern`.
