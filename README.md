# E-commerce QA Automation Framework

A Playwright + TypeScript end-to-end and API test suite built against
[automationexercise.com](https://automationexercise.com), a public
practice site for QA engineers. Built as a portfolio piece to demonstrate
the same patterns used in production test suites: Page Object Model,
environment-driven config, custom fixtures, and CI integration.

## Why these choices

- **Page Object Model** — each page's locators and actions live in one
  class (`src/pages/`). Tests read as user behaviour ("log in", "add to
  cart"), not raw selectors, so a UI change means updating one page object
  instead of every test that touches that screen.
- **Custom fixtures** (`src/fixtures/pageFixtures.ts`) — page objects are
  injected automatically into every test, removing repetitive setup code
  from spec files.
- **Data factory, not hardcoded fixtures** (`src/data/testDataFactory.ts`)
  — signup requires a unique email per run; generating fresh data avoids
  flaky "email already exists" failures on repeated CI runs.
- **Environment config** (`src/config/env.ts`) — base URLs come from
  environment variables, so the same suite can point at a different
  environment (staging, a fork of the demo site, etc.) without code
  changes.
- **API tests alongside UI tests** (`tests/api/`) — faster feedback for
  backend-only regressions, and proof the suite isn't only UI-deep.

## Project structure

```
├── src/
│   ├── config/        # environment config
│   ├── data/           # test data factories
│   ├── fixtures/       # custom Playwright fixtures (page objects)
│   └── pages/           # Page Object Model classes
├── tests/
│   ├── e2e/             # UI end-to-end specs
│   └── api/             # API-level specs
├── docs/
│   └── BUG_LOG.md        # real issues found while building this suite
└── .github/workflows/    # CI pipeline
```

## Setup

```bash
npm install
npx playwright install --with-deps
cp .env.example .env
```

## Running tests

```bash
npm test                 # full suite, all browsers
npm run test:chromium    # single browser
npm run test:e2e         # UI specs only
npm run test:api         # API specs only
npm run test:ui          # Playwright's interactive UI mode
npm run report           # open the last HTML report
```

## CI

Every push and pull request to `main` runs the full suite across
Chromium, Firefox, and WebKit via GitHub Actions
(`.github/workflows/ci.yml`), with the HTML report uploaded as a build
artifact.

## Known limitations

- A handful of locators (flagged in code comments) are matched against the
  site's DOM structure directly, since `automationexercise.com` doesn't
  expose `data-qa` hooks on every element (e.g. product tiles, the cart
  quantity cell). These are the more brittle of the two approaches and the
  most likely to need re-verifying if the site's markup changes — run
  `npm run codegen` against the live site to re-check if tests start
  failing unexpectedly.
- This is a demo/practice site with a dummy payment gateway — the checkout
  test verifies the real post-payment confirmation page reached by the
  live flow (see `docs/BUG_LOG.md` BUG-002 for why that's not the message
  the static payment page HTML suggests you'd assert on). The gateway also
  has no real field validation beyond the browser's native "required"
  check — a present-but-invalid card number is accepted outright (BUG-005)
  — so the sad-path checkout test targets the one behaviour that's
  actually enforced (a missing card number), not card-format validation
  that doesn't exist.
- `automationexercise.com` is a shared public site, not an isolated test
  environment — it noticeably slows down or hangs requests under heavy
  concurrent load from a single source. `playwright.config.ts` caps
  `workers` at 2 and allows one retry outside CI for this reason; see the
  comment there and the infra note at the bottom of `docs/BUG_LOG.md`
  before raising either value.

## Bugs found

See [`docs/BUG_LOG.md`](docs/BUG_LOG.md) for real issues discovered while
building and running this suite.
