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
          // NOTE: Using same-origin-allow-popups instead of same-origin to avoid
          // breaking OAuth flows or payment popups if added later.
          { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
          // Content Security Policy
          // NOTE: 'unsafe-inline' is required for script-src because Next.js 15
          // injects inline scripts for hydration and Server Components. Removing it
          // would break the app. Using 'strict-dynamic' as a forward-compatible
          // addition: browsers that support it will honour the hash/nonce list and
          // ignore 'unsafe-inline'; older browsers fall back to 'unsafe-inline'.
          // TODO: generate per-request nonces via middleware and remove
          //       'unsafe-inline' entirely once nonce support is wired up.
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              // 'strict-dynamic' supersedes 'unsafe-inline' in supporting browsers
              "script-src 'self' 'unsafe-inline' 'strict-dynamic'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https://*.vercel-storage.com https://*.public.blob.vercel-storage.com",
              "font-src 'self'",
              "connect-src 'self' https://*.vercel-storage.com",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'self'",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
