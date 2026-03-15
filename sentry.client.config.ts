import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://32fa9be0085a181722ad3e3c70654267@o4511048282865664.ingest.de.sentry.io/4511048288567376",

  // Tracing
  tracesSampleRate: 1.0,

  // Session Replay
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],

  _experiments: {
    enableLogs: true,
  },
});
