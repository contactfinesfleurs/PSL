/**
 * Environment variable validation.
 *
 * This module validates required environment variables at server startup.
 * Import it in modules that use sensitive env vars so missing values fail fast
 * instead of crashing at runtime on first use.
 *
 * Validation only runs outside of development so local dev remains easy to
 * bootstrap without a full set of secrets.
 */

// Required in production / staging / preview / test
const required = ["JWT_SECRET", "DATABASE_URL", "BLOB_READ_WRITE_TOKEN", "CRON_SECRET"];

if (process.env.NODE_ENV !== "development") {
  for (const key of required) {
    if (!process.env[key]) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
  }
}

export const env = {
  JWT_SECRET: process.env.JWT_SECRET,
  DATABASE_URL: process.env.DATABASE_URL,
  BLOB_READ_WRITE_TOKEN: process.env.BLOB_READ_WRITE_TOKEN,
  NODE_ENV: process.env.NODE_ENV,
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL,
};
