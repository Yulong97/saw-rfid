import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '100mb', // 设置 Server Actions 请求体大小限制为 10MB
    },
  },
};

export default nextConfig;
