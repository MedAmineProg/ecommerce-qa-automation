import { Locator, Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class ProductsPage extends BasePage {
  readonly searchInput: Locator;
  readonly searchButton: Locator;
  readonly productTiles: Locator;
  readonly searchedProductsHeading: Locator;

  constructor(page: Page) {
    super(page);
    this.searchInput = page.locator('#search_product');
    this.searchButton = page.locator('#submit_search');
    this.productTiles = page.locator('.product-image-wrapper');
    // The site has no dedicated "no results" message (see BUG-004 in
    // docs/BUG_LOG.md) — a zero-match search still renders this heading
    // with an empty grid underneath, which is the only way to confirm the
    // search actually ran rather than the page being stuck/broken.
    this.searchedProductsHeading = page.getByRole('heading', { name: 'Searched Products' });
  }

  async open(): Promise<void> {
    await this.goto('/products');
  }

  async search(term: string): Promise<void> {
    await this.searchInput.fill(term);
    await this.searchButton.click();
  }

  async resultsCount(): Promise<number> {
    return this.productTiles.count();
  }

  /**
   * Each product tile renders two "Add to cart" links — one always visible,
   * one inside a hover overlay (same text, same class). Scoping to
   * `.productinfo` avoids a strict-mode violation from matching both.
   */
  async addFirstResultToCart(): Promise<void> {
    const first = this.productTiles.first();
    await first.locator('.productinfo a.add-to-cart').click();
  }
}
