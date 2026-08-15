import { Locator, Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class CartPage extends BasePage {
  readonly cartRows: Locator;
  readonly proceedToCheckoutButton: Locator;
  readonly emptyCartMessage: Locator;

  constructor(page: Page) {
    super(page);
    this.cartRows = page.locator('#cart_info tbody tr');
    this.proceedToCheckoutButton = page.getByText('Proceed To Checkout');
    this.emptyCartMessage = page.getByText('Cart is empty!');
  }

  async open(): Promise<void> {
    await this.goto('/view_cart');
  }

  async itemCount(): Promise<number> {
    return this.cartRows.count();
  }

  async removeItem(rowIndex: number): Promise<void> {
    await this.cartRows.nth(rowIndex).locator('.cart_quantity_delete').click();
  }

  async proceedToCheckout(): Promise<void> {
    await this.proceedToCheckoutButton.click();
  }

  /**
   * The quantity cell is a disabled <button> displaying the count, not an
   * editable <input> — the cart has no in-page way to change quantity
   * (see BUG-003 in docs/BUG_LOG.md).
   */
  quantityFor(rowIndex: number): Locator {
    return this.cartRows.nth(rowIndex).locator('.cart_quantity button');
  }
}
