import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://32fa9be0085a181722ad3e3c70654267@o4511048282865664.ingest.de.sentry.io/4511048288567376",

  // Tracing
  tracesSampleRate: 1.0,

  // Capture local variables on errors
  includeLocalVariables: true,

  _experiments: {
    enableLogs: true,
  },
});
