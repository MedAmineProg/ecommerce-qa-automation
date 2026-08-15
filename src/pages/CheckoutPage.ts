import { Locator, Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class CheckoutPage extends BasePage {
  readonly commentTextArea: Locator;
  readonly placeOrderButton: Locator;
  readonly nameOnCardInput: Locator;
  readonly cardNumberInput: Locator;
  readonly cvcInput: Locator;
  readonly expiryMonthInput: Locator;
  readonly expiryYearInput: Locator;
  readonly payAndConfirmButton: Locator;
  readonly orderConfirmationMessage: Locator;

  constructor(page: Page) {
    super(page);
    this.commentTextArea = page.locator('textarea[name="message"]');
    this.placeOrderButton = page.getByText('Place Order');
    this.nameOnCardInput = page.locator('[data-qa="name-on-card"]');
    this.cardNumberInput = page.locator('[data-qa="card-number"]');
    this.cvcInput = page.locator('[data-qa="cvc"]');
    this.expiryMonthInput = page.locator('[data-qa="expiry-month"]');
    this.expiryYearInput = page.locator('[data-qa="expiry-year"]');
    this.payAndConfirmButton = page.locator('[data-qa="pay-button"]');
    // The payment page's HTML ships a hidden "Your order has been placed
    // successfully!" alert (#success_message), but the live site never
    // actually reveals it — submitting does a full-page navigation to
    // /payment_done/<id>, which shows this "Order Placed!" heading instead.
    // See BUG-002 in docs/BUG_LOG.md.
    this.orderConfirmationMessage = page.getByRole('heading', { name: 'Order Placed!' });
  }

  async addOrderComment(comment: string): Promise<void> {
    await this.commentTextArea.fill(comment);
  }

  async placeOrder(): Promise<void> {
    await this.placeOrderButton.click();
  }

  async payWithDummyCard(cardholderName: string): Promise<void> {
    await this.nameOnCardInput.fill(cardholderName);
    await this.cardNumberInput.fill('4111111111111111');
    await this.cvcInput.fill('123');
    await this.expiryMonthInput.fill('12');
    await this.expiryYearInput.fill('2028');
    await this.payAndConfirmButton.click();
  }
}
