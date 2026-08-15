import { Locator, Page } from '@playwright/test';
import { BasePage } from './BasePage';
import { AccountDetails } from '../data/testDataFactory';

/**
 * The "ENTER ACCOUNT INFORMATION" form shown after starting signup on
 * LoginPage. Field selectors follow the site's `name`/`id` attributes
 * (no data-qa hooks on this particular form) — verify against the live
 * DOM before trusting these for a real submission.
 */
export class SignupPage extends BasePage {
  readonly titleMrRadio: Locator;
  readonly titleMrsRadio: Locator;
  readonly passwordInput: Locator;
  readonly daysSelect: Locator;
  readonly monthsSelect: Locator;
  readonly yearsSelect: Locator;
  readonly firstNameInput: Locator;
  readonly lastNameInput: Locator;
  readonly addressInput: Locator;
  readonly countrySelect: Locator;
  readonly stateInput: Locator;
  readonly cityInput: Locator;
  readonly zipcodeInput: Locator;
  readonly mobileNumberInput: Locator;
  readonly createAccountButton: Locator;
  readonly accountCreatedBanner: Locator;
  readonly continueButton: Locator;

  constructor(page: Page) {
    super(page);
    this.titleMrRadio = page.locator('#id_gender1');
    this.titleMrsRadio = page.locator('#id_gender2');
    this.passwordInput = page.locator('[data-qa="password"]');
    this.daysSelect = page.locator('[data-qa="days"]');
    this.monthsSelect = page.locator('[data-qa="months"]');
    this.yearsSelect = page.locator('[data-qa="years"]');
    this.firstNameInput = page.locator('[data-qa="first_name"]');
    this.lastNameInput = page.locator('[data-qa="last_name"]');
    this.addressInput = page.locator('[data-qa="address"]');
    this.countrySelect = page.locator('[data-qa="country"]');
    this.stateInput = page.locator('[data-qa="state"]');
    this.cityInput = page.locator('[data-qa="city"]');
    this.zipcodeInput = page.locator('[data-qa="zipcode"]');
    this.mobileNumberInput = page.locator('[data-qa="mobile_number"]');
    this.createAccountButton = page.locator('[data-qa="create-account"]');
    this.accountCreatedBanner = page.getByText('Account Created!');
    this.continueButton = page.locator('[data-qa="continue-button"]');
  }

  async completeAccountInfo(details: AccountDetails): Promise<void> {
    await (details.title === 'Mr' ? this.titleMrRadio : this.titleMrsRadio).check();
    await this.passwordInput.fill(details.password);
    await this.daysSelect.selectOption(details.birthDay);
    await this.monthsSelect.selectOption(details.birthMonth);
    await this.yearsSelect.selectOption(details.birthYear);
    await this.firstNameInput.fill(details.firstName);
    await this.lastNameInput.fill(details.lastName);
    await this.addressInput.fill(details.address);
    await this.countrySelect.selectOption(details.country);
    await this.stateInput.fill(details.state);
    await this.cityInput.fill(details.city);
    await this.zipcodeInput.fill(details.zipcode);
    await this.mobileNumberInput.fill(details.mobileNumber);
    await this.createAccountButton.click();
  }

  async confirmAndContinue(): Promise<void> {
    await this.continueButton.click();
  }
}
