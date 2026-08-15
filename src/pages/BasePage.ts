import { Page } from '@playwright/test';

/**
 * Shared behaviour every page object inherits. Keeping this thin on purpose —
 * it's a home for genuinely cross-cutting concerns (navigation, waits),
 * not a dumping ground for unrelated helpers.
 */
export abstract class BasePage {
  constructor(protected readonly page: Page) {}

  async goto(path: string = '/'): Promise<void> {
    await this.page.goto(path);
  }

  async title(): Promise<string> {
    return this.page.title();
  }
}
