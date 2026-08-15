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

- A handful of selectors (flagged in code comments) are matched against
  the site's DOM structure as of the time this was built. `automationexercise.com`
  doesn't expose `data-qa` hooks on every form, so some locators use
  `name`/`id` attributes instead — the more brittle of the two approaches.
  Run `npm run codegen` to re-generate and verify if tests start failing
  unexpectedly.
- This is a demo/practice site with a dummy payment gateway — the checkout
  test verifies the confirmation message, not a real payment integration.

## Bugs found

See [`docs/BUG_LOG.md`](docs/BUG_LOG.md) for real issues discovered while
building and running this suite.
