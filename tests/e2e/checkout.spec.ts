import { test, expect } from '../../src/fixtures/pageFixtures';
import { createNewUser } from '../../src/data/testDataFactory';

test.describe('Checkout', () => {
  test('a signed-up user can place an order end to end', async ({
    homePage,
    loginPage,
    signupPage,
    productsPage,
    cartPage,
    checkoutPage,
    page,
  }) => {
    const user = createNewUser();

    // Arrange: create an account (checkout requires being logged in)
    await homePage.open();
    await homePage.goToLogin();
    await loginPage.startSignup(user.name, user.email);
    await signupPage.completeAccountInfo(user.account);
    await signupPage.confirmAndContinue();

    // Act: add a product and walk through checkout
    await productsPage.open();
    await productsPage.addFirstResultToCart();
    await page.getByRole('link', { name: 'View Cart' }).click();
    await cartPage.proceedToCheckout();

    await expect(page.getByText('Address Details')).toBeVisible();
    await expect(page.getByText('Review Your Order')).toBeVisible();

    await checkoutPage.addOrderComment('Automated portfolio test — please ignore.');
    await checkoutPage.placeOrder();
    await checkoutPage.payWithDummyCard(user.name);

    // Assert: dummy gateway confirms the order
    await expect(checkoutPage.orderConfirmationMessage).toBeVisible();
  });

  test('checkout blocks submission when the card number is missing', async ({
    homePage,
    loginPage,
    signupPage,
    productsPage,
    cartPage,
    checkoutPage,
    page,
  }) => {
    const user = createNewUser();

    // Arrange: create an account and reach the payment step, same as the
    // happy-path flow above.
    await homePage.open();
    await homePage.goToLogin();
    await loginPage.startSignup(user.name, user.email);
    await signupPage.completeAccountInfo(user.account);
    await signupPage.confirmAndContinue();

    await productsPage.open();
    await productsPage.addFirstResultToCart();
    await page.getByRole('link', { name: 'View Cart' }).click();
    await cartPage.proceedToCheckout();

    await checkoutPage.addOrderComment('Automated portfolio test — please ignore.');
    await checkoutPage.placeOrder();

    // Act: submit payment with every field filled except card number.
    await checkoutPage.submitPaymentWithoutCardNumber(user.name);

    // Assert: the site has no custom validation message for this — it
    // relies entirely on the browser's native required-field constraint,
    // which blocks the click and keeps the user on /payment. Verified
    // against chromium, firefox, and webkit.
    await expect(page).toHaveURL(/\/payment$/);
    expect(await checkoutPage.isCardNumberFieldInvalid()).toBe(true);
    await expect(checkoutPage.orderConfirmationMessage).not.toBeVisible();
  });
});
