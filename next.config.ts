import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return ["/book/:token", "/feedback/:token", "/service-history/:token"].map((source) => ({
      source,
      headers: [{ key: "Referrer-Policy", value: "no-referrer" }],
    }));
  },
};

export default nextConfig;
