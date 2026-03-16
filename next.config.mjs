import { withSentryConfig } from "@sentry/nextjs";

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [],
  },
  serverExternalPackages: ["@prisma/client", "prisma"],

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // Prevent MIME-type sniffing
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Prevent clickjacking
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          // Legacy XSS filter
          { key: "X-XSS-Protection", value: "1; mode=block" },
          // Limit referrer info sent to third parties
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Restrict browser feature access
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
          },
          // Force HTTPS for 2 years
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          // Prevent cross-origin window interactions (e.g. Spectre-style attacks)
          { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
          // Prevent cross-origin reads of our resources (e.g. images) by
          // other origins — complements frame-ancestors and CORS.
          { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
          // Content-Security-Policy is set dynamically per-request in
          // src/middleware.ts with a per-request nonce so that
          // 'strict-dynamic' can replace 'unsafe-inline' in modern browsers.
        ],
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  org: "contactfinesfleurs",
  project: "javascript-nextjs",

  // Tunnel Sentry requests through /monitoring to bypass ad-blockers
  tunnelRoute: "/monitoring",

  // Upload source maps for readable production stack traces
  // Requires SENTRY_AUTH_TOKEN env variable
  sourcemaps: {
    deleteSourcemapsAfterUpload: true,
  },

  // Disable Sentry telemetry
  telemetry: false,

  // Suppress build logs
  silent: !process.env.CI,
});
