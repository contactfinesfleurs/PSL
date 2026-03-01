/** @type {import('next').NextConfig} */
const nextConfig = {
  // Remove the X-Powered-By: Next.js header (server information disclosure)
  poweredByHeader: false,

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
          // Clickjacking protection
          { key: "X-Frame-Options", value: "DENY" },
          // Stop passing Referer headers to third-party origins
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // HSTS: enforce HTTPS for 1 year, include subdomains
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
          // Disable access to sensitive browser features
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=()",
          },
          // Content Security Policy
          // - Next.js App Router requires 'unsafe-inline' for script (hydration)
          // - Images served from Vercel Blob storage
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https://*.vercel-storage.com https://*.public.blob.vercel-storage.com",
              "font-src 'self'",
              "connect-src 'self' https://*.vercel-storage.com",
              "frame-src 'none'",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
