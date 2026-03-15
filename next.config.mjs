import { withSentryConfig } from "@sentry/nextjs";

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.vercel-storage.com",
      },
      {
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com",
      },
    ],
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
          // Content Security Policy
          // 'unsafe-inline' is required for script-src because Next.js 15
          // injects inline scripts for hydration and Server Components without
          // nonces. 'strict-dynamic' is intentionally absent: it overrides
          // 'unsafe-inline' in modern browsers, which blocks all Next.js scripts
          // and leaves the page non-interactive.
          // 'upgrade-insecure-requests' instructs browsers to silently upgrade
          // any HTTP sub-resource requests to HTTPS before making them.
          // Sentry SDK uses worker-src for Session Replay.
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https://*.vercel-storage.com https://*.public.blob.vercel-storage.com",
              "font-src 'self'",
              // /monitoring is the Sentry tunnel route (same-origin proxy)
              "connect-src 'self' https://*.vercel-storage.com",
              "worker-src 'self' blob:",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'self'",
              "upgrade-insecure-requests",
            ].join("; "),
          },
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
