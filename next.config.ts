import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // CVE-2025-66478 보안 대응
  images: {
    dangerouslyAllowLocalIP: false,
    maximumRedirects: 3,
    remotePatterns: [],
  },
};

export default nextConfig;
