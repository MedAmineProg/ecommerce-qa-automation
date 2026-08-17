/** @type {import('jest').Config} */
module.exports = {
  // Scoped to the squashtm-exporter module only — the rest of the repo's
  // tests are Playwright specs (*.spec.ts), a different test runner with
  // its own config (playwright.config.ts). Keeping Jest's testMatch
  // narrow avoids it trying to crawl or execute those.
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',
  testMatch: ['<rootDir>/src/reporting/squashtm-exporter/src/__tests__/**/*.test.ts'],
};
