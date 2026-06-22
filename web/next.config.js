/** @type {import('next').NextConfig} */

// Served as a Next.js Multi-Zone "secondary" app under a path prefix on the
// portfolio domain (e.g. yoursite.com/kci). basePath is env-driven so local dev
// stays at "/" while the production build is namespaced under the prefix.
// Set NEXT_PUBLIC_BASE_PATH=/kci in the deployment environment.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || ""

const nextConfig = {
  // basePath auto-prefixes all routes, <Link>/router navigations, and /_next
  // assets, so the app is correctly addressable when proxied under the prefix.
  basePath: basePath || undefined,
  // Config redirects ARE basePath-aware (unlike a server-component redirect()),
  // so "/" → "/dashboard" becomes "/kci" → "/kci/dashboard" when prefixed.
  async redirects() {
    return [{ source: "/", destination: "/dashboard", permanent: false }]
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000",
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
}

module.exports = nextConfig
