import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export', // 정적 빌드 활성화 (Capacitor 필수)
  trailingSlash: true, // 정적 라우팅 호환
  // CVE-2025-66478 보안 대응
  images: {
    unoptimized: true, // 정적 이미지 처리
    dangerouslyAllowLocalIP: false,
    maximumRedirects: 3,
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
  },
};

export default nextConfig;
