# SquashTM Test Execution Exporter

Converts a Playwright JSON test report into a CSV file matching SquashTM's
test execution import format, and — via `--push` — can also publish those
same results live to a real SquashTM instance over its REST API. Closes the
loop between automated test runs and enterprise test management.

## Why this exists

Most Playwright portfolio projects stop at "tests pass in CI." This module
demonstrates the piece that usually only shows up in real enterprise QA
workflows: getting automated results *into* a test management tool that
non-engineers (QA leads, product owners) actually look at — and, for the
live-push path, proving that integration against a real, self-hosted
instance rather than mocked HTTP responses.

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
        │
        ▼ (only with --push)
  api-client.ts — POSTs the same rows to a live SquashTM instance
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

# 3. (optional) also push the same results live to a real SquashTM instance
npx ts-node src/index.ts report.json squashtm-import.csv --push
```

From the repo root, `npm run export:squashtm` wraps steps 1–2 (CSV only —
add `-- --push` to also push live). The CSV path needs nothing beyond
Node; `--push` needs `SQUASHTM_BASE_URL`, `SQUASHTM_API_TOKEN`, and
`SQUASHTM_ITERATION_ID` set (see `.env.example` at the repo root, and
"Live REST API integration" below for what these mean and how to get them).

## Try it against the sample fixture

```bash
npx ts-node src/index.ts fixtures/sample-playwright-report.json out.csv
cat out.csv
```

## Tests

```bash
npm run test:unit   # from the repo root — runs this module's Jest suite
```

---

## Live REST API integration — what was actually verified

Everything below was verified against a **real, self-hosted SquashTM
15.0.0 instance** (`squashtest/squash` Docker image, Community edition —
see `../../../squashtm/README.md` for how to stand one up), not against
documentation alone and not against mocked responses. Several things
turned out to differ from what was originally assumed, and from what
SquashTM's own docs say in places — each is called out below with how it
was confirmed.

### The plugin named in the original brief doesn't apply

`org.squashtest.tm.plugin:automation.result.publisher.community` — the
"Automation Result Publisher" plugin — is **discontinued**. This isn't
just a documentation label: the running instance's own startup logs show
a Liquibase changeset literally named
`tm-6.0.0-squash-remove-resultpublisher-plugin-binding`, i.e. the plugin's
database binding was actively removed starting at SquashTM 6.0.0. We
tested against 15.0.0. It also required a separate component, Squash
Orchestrator, to function at all — it was never a "point Playwright's CI
output at this plugin" mechanism.

The current, supported equivalent is a plain REST endpoint (below), no
plugin or Orchestrator required.

### Docker image

Neither of the two community images this task originally pointed at is
usable — both are abandoned:

| Image | Packages | Status |
|---|---|---|
| `fjudith/squash-tm` | SquashTM 1.18.5 | no recent activity, `tomcat:8-jre7` base |
| `Logicify/docker-squash-tm` | SquashTM 1.14.0 | 13 commits total, same vintage |
| `squashtest/squash` (used here) | 15.0.0 (nightly builds exist) | official, published by Squashtest, updated regularly |

### Authentication: Bearer token only, and it needs setup

SquashTM's docs describe two REST API auth methods — Basic and Bearer —
with Basic being phased out (disabled by default from mid-2025, dropped
entirely by mid-2026, per the docs' own stated timeline). Empirically,
against the live 15.0.0 instance:

```
$ curl -u admin:admin http://localhost:8090/squash/api/rest/latest/tokens
Basic authentication is not allowed for REST API.   (HTTP 401)
```

Bearer token is the only method that actually works. Getting one is not
as simple as the docs imply, though:

- **The docs claim** the session cookie from a browser login is "also
  valid" for API calls. Empirically false on this instance — tested from
  *inside* an authenticated browser session (`fetch()` with
  `credentials: 'include'` against `/api/rest/latest/projects`) and still
  got a 401.
- **Token creation itself failed by default** with "No JWT secret is
  defined for this instance." — the `squash.rest-api.jwt.secret` property
  isn't set by the Docker image out of the box. Fixed by passing
  `SQUASH_REST_API_JWT_SECRET` (Spring Boot's relaxed env-var binding for
  that property) in `docker-compose.yml`; see `squashtm/README.md`.
- **There is no way to bootstrap a token via the API itself** — Basic is
  rejected, session cookies don't work, so the only path is a human
  logging into the UI and generating a Personal API Token there (My
  account → Personal API tokens). This is inherent to the auth model, not
  a gap in this module — `api-client.ts` takes the token as a given.
- **The token the UI hands you is base64-wrapped.** The "Create API
  token" response is `{"token": "<base64>"}`; decoding that base64 once
  yields the real 3-segment JWT. Confirmed which one the API actually
  wants by testing both directly: the wrapped value gets a 401, the
  decoded JWT gets a 200. `SQUASHTM_API_TOKEN` must be the **decoded**
  value.

### The real endpoint

```
POST /api/rest/latest/import/results/{iteration_id}
Authorization: Bearer <decoded JWT>
Content-Type: application/json

{
  "tests": [
    { "reference": "TC-101", "status": "FAILURE", "duration": 5000 }
  ]
}
```

- `reference` is matched against the target Test Case's **Automated Test
  Reference** field within that iteration's test plan — the test case
  must already exist and already be planned into the iteration, or the
  import returns a clear per-test error (`Test with reference X ... not
  found in iteration <name>`) rather than failing the whole request.
- `status` vocabulary confirmed from the live docs: `BLOCKED`,
  `CANCELLED`, `SUCCESS`, `RUNNING`, `SKIPPED`, `FAILURE`, `READY`.
- Success is `204 No Content`. Partial failure (some references didn't
  match, or a field hit a licensing restriction) is `207 Multi-Status`
  with a per-test breakdown — `api-client.ts` surfaces exactly which
  references failed and why, rather than treating the whole batch as
  either fully OK or fully failed.

### Setting a Test Case's Automated Test Reference

This field is **read-only** on the public REST API's `/test-cases`
create/update payloads (it shows up in GET responses but can't be set
there — confirmed by reading the live API docs' request-fields table,
which lists it nowhere on create). Full auto-discovery via a configured
Test Automation Server (Jenkins, etc.) is one path, but there's a much
lighter one for exactly this pipeline-push scenario: the Test Case detail
page in the UI has an **"Automated test ref... (Click to edit...)"**
field, settable directly, no CI/SCM integration required. (Its underlying
call is `POST /backend/test-case/{id}/automated-test-reference` — an
internal, UI-only endpoint, not part of the public REST API; setting it
is a one-time step per test case, done once in the UI, not part of the CI
loop.)

### Duplicate references within one batch are rejected

Pushing this repo's actual multi-browser CSV (chromium + firefox +
webkit — every test case's reference appears 3×) in a single `--push`
call fails the whole request with HTTP 412:

```json
{"fieldValidationErrors":[{"errorMessage":"The reference and dataset name combination must be unique","fieldName":"tests[4]", ...}]}
```

The import endpoint requires each `reference` (+ dataset, if any) to be
unique *within one request* — it has no concept of "same test, three
browsers" and no way to disambiguate repeats in a single call. Confirmed
by reproducing it directly: pushing the full 39-row export failed
outright; filtering to a single browser's 13 unique references
(`npx playwright test --project=chromium --reporter=json | ... --push`)
succeeded. `api-client.ts` doesn't work around this yet — sending one
call per browser, or per test, would be the fix, but that's real design
work (dataset-per-browser? separate iterations per browser?) rather than
a one-line change, so it's left as a documented limitation rather than a
rushed fix.

This is also why the repo-root `posttest` auto-push hook (see the root
README's Test Reporting section) scopes itself to chromium's results only
— pushing the real multi-browser output automatically would fail on
every single green run otherwise.

### A real Community-edition limitation

The import payload supports an optional `failure_details` array for
richer failure messages. In SquashTM Community edition, using it at all
fails that test with: *"Adding failure details is only available for
SquashTM Premium or Ultimate licenses."* (HTTP 207, confirmed directly).
`api-client.ts` deliberately never sends `failure_details` — `status` and
`duration` alone are enough to update execution status, which is this
module's actual job, and it means this works unmodified against the
open-source edition.

### End-to-end verification performed

Via the live REST API (not the UI, except where noted): created a
project, a test case (its Automated Test Reference set to `TC-101` via
the UI field above), a campaign, an iteration, and a test-plan item
placing that test case into the iteration. Ran this module's actual CLI
(`ts-node src/index.ts fixtures/sample-playwright-report.json out.csv
--push`) against it — confirmed:

- `TC-101` (in the test plan) imported cleanly; SquashTM's own execution
  status for that test plan item flipped to match (`FAILURE`, then
  `SUCCESS` on a second push with the sample fixture's actual status),
  visible both via `GET /test-plan-items/{id}` and in the SquashTM UI
  (the project's Campaign Statistics dashboard, and the iteration's
  execution plan table).
- `TC-102` and the unmapped test (neither in the test plan) correctly
  came back as per-test 207 errors, printed clearly by the CLI, rather
  than crashing the whole push or failing silently.

Verified again later, against this repo's real suite rather than the
sample fixture: ran `npm run export:squashtm -- --push` for real
(chromium only, per the duplicate-reference limitation above) and
confirmed the result in the SquashTM UI — screenshot in the root
[README's Test Reporting section](../../../README.md#test-reporting).
At that point only `TC-101` had a test case set up in the demo project,
so the other 12 references correctly came back as "not found in
iteration" per-test errors — real, correct behaviour for an incomplete
test plan, not a bug.

All 13 of this repo's `[TC-xxx]` references now have a matching test
case in the demo project's test plan (created via `POST /test-cases`,
Automated Test Reference set via the same UI-only endpoint above, added
to the iteration via `POST /iterations/{id}/test-plan` — same calls
documented throughout this file, just done 13× instead of 1×). A
`--project=chromium` push now reports `13/13 accepted, 0 errors`. The
`docs/images/squashtm-push-proof.png` screenshot in the root README
reflects this fully-populated state.

## Adapting this to a real (non-local, non-Community) SquashTM instance

1. Confirm your instance's actual REST API docs at
   `<your-instance>/api/rest/latest/docs/api-documentation.html` — this
   is generated per-instance/version and is the authoritative source; do
   not assume the details above hold for a different version.
2. If you're on Premium/Ultimate, you likely can re-enable
   `failure_details` in `api-client.ts`.
3. Update `csvColumns` / `statusMap` / `referencePattern` in `config.ts`
   if your CSV import template or naming convention differs — unchanged
   by the live-push addition, still the single place to adjust those.
4. Confirm whether Basic auth is still enabled on your instance
   (`squash.rest-api.disallow-basic-authentication`) before assuming
   Bearer-only.
