import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // CVE-2025-66478 보안 대응
  images: {
    dangerouslyAllowLocalIP: false,
    maximumRedirects: 3,
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
  },
};

export default nextConfig;
