import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Dev-only same-origin proxy to the Django backend (design.md §1, NFR-02).
  // In prod, infra/nginx.conf performs the equivalent same-origin routing —
  // this rewrite must never run outside local development.
  async rewrites() {
    if (process.env.NODE_ENV !== "development") {
      return [];
    }
    return [
      {
        source: "/api/:path*",
        destination: "http://127.0.0.1:8000/api/:path*",
      },
    ];
  },
};

export default nextConfig;
