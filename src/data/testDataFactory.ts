import { faker } from '@faker-js/faker';

export interface AccountDetails {
  title: 'Mr' | 'Mrs';
  password: string;
  birthDay: string;
  birthMonth: string;
  birthYear: string;
  firstName: string;
  lastName: string;
  address: string;
  country: string;
  state: string;
  city: string;
  zipcode: string;
  mobileNumber: string;
}

export interface NewUser {
  name: string;
  email: string;
  account: AccountDetails;
}

/**
 * Generates a fresh, unique user for signup-flow tests. Using a factory
 * instead of hardcoded fixtures means tests can run repeatedly against a
 * shared environment without colliding on "email already exists" errors —
 * a real constraint this site's signup form enforces.
 */
export function createNewUser(): NewUser {
  const firstName = faker.person.firstName();
  const lastName = faker.person.lastName();
  // A timestamp alone can collide when parallel workers generate a user in
  // the same millisecond with the same faker-picked first name; the random
  // suffix rules that out without needing a lock or a shared counter.
  const uniqueSuffix = `${Date.now()}.${faker.string.alphanumeric(6)}`;
  const email = `qa.${firstName}.${uniqueSuffix}@example.com`.toLowerCase();

  return {
    name: `${firstName} ${lastName}`,
    email,
    account: {
      title: 'Mr',
      password: faker.internet.password({ length: 12 }),
      birthDay: String(faker.number.int({ min: 1, max: 28 })),
      birthMonth: String(faker.number.int({ min: 1, max: 12 })),
      birthYear: String(faker.number.int({ min: 1980, max: 2002 })),
      firstName,
      lastName,
      address: faker.location.streetAddress(),
      country: 'United States',
      state: faker.location.state(),
      city: faker.location.city(),
      zipcode: faker.location.zipCode(),
      mobileNumber: faker.phone.number(),
    },
  };
}
