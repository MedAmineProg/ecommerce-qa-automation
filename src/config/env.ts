/**
 * Central place for environment-driven config.
 * Lets the suite run against different environments (e.g. a staging mirror)
 * without touching test code — just swap the .env file or CI secret.
 */
import * as dotenv from 'dotenv';

dotenv.config();

export const env = {
  baseUrl: process.env.BASE_URL || 'https://automationexercise.com',
  apiBaseUrl: process.env.API_BASE_URL || 'https://automationexercise.com/api',
};
