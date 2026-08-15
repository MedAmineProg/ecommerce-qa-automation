import { Locator, Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class HomePage extends BasePage {
  readonly signupLoginLink: Locator;
  readonly cartLink: Locator;
  readonly productsLink: Locator;

  constructor(page: Page) {
    super(page);
    this.signupLoginLink = page.getByRole('link', { name: /signup \/ login/i });
    this.cartLink = page.getByRole('link', { name: /cart/i });
    this.productsLink = page.getByRole('link', { name: /products/i });
  }

  async open(): Promise<void> {
    await this.goto('/');
  }

  async goToLogin(): Promise<void> {
    await this.signupLoginLink.click();
  }

  async goToCart(): Promise<void> {
    await this.cartLink.click();
  }

  async goToProducts(): Promise<void> {
    await this.productsLink.click();
  }

  /**
   * Adds a product to the cart directly from the home/listing grid by
   * product id, mirroring how a real shopper hovers a tile and clicks "Add to cart".
   * NOTE: verify this selector against the live DOM — automationexercise.com
   * doesn't publish a stable data-qa hook for this button, so it's matched
   * via the product tile structure instead.
   */
  async addProductToCartById(productId: number): Promise<void> {
    const tile = this.page.locator(`.product-image-wrapper:has(a[href="/product_details/${productId}"])`);
    await tile.hover();
    await tile.getByText('Add to cart').click();
  }
}
