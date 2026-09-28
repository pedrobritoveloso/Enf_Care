import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  // Força o TypeScript a ignorar a verificação do tipo nesta propriedade
  ...({
    eslint: {
      ignoreDuringBuilds: true,
    },
  } as any),
};

export default nextConfig;