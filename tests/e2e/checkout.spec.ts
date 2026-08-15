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
});
