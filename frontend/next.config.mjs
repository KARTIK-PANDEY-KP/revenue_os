/** @type {import('next').NextConfig} */
const backend = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000";

const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "logo.clearbit.com" },
      { protocol: "https", hostname: "**" },
    ],
  },
  async rewrites() {
    // Proxy /backend/* to the FastAPI service (keeps same-origin in dev).
    return [{ source: "/backend/:path*", destination: `${backend}/:path*` }];
  },
};

export default nextConfig;
