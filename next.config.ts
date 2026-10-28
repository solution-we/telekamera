import type { NextConfig } from "next";

const storageOrigin = process.env.S3_ENDPOINT ? new URL(process.env.S3_ENDPOINT).origin : "";
const upgradeDirective = process.env.NODE_ENV === "production" ? "; upgrade-insecure-requests" : "";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          {
            key: "Content-Security-Policy",
            value: `default-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; object-src 'none'; img-src 'self' data:; font-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; connect-src 'self' ${storageOrigin};${upgradeDirective}`,
          },
        ],
      },
    ];
  },
};

export default nextConfig;
