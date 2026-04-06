import type { NextConfig } from "next";

/**
 * Docker(특히 Windows 바인드 마운트)에서 Next 16 기본 번들러(Turbopack)는
 * 네이티브 파일 감시가 동작하지 않는 경우가 많습니다.
 * `WATCHPACK_POLLING`은 Webpack 전용이라 Turbopack에는 무시되며,
 * Turbopack은 `watchOptions.pollIntervalMs`로만 폴링을 켭니다.
 * @see https://nextjs.org/docs/app/api-reference/config/next-config-js/watchOptions
 */
const useDevPolling =
  process.env.WATCHPACK_POLLING === "true" ||
  process.env.NEXT_DEV_POLLING === "true";

const disableWebpackCacheInDev =
  process.env.NEXT_WEBPACK_NO_CACHE === "true";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["@prisma/client", "pg"],
  /** 2MB 프로필 이미지 + multipart 오버헤드 — 한도가 너무 낮으면 액션에 도달하기 전에 터져 전역 오류처럼 보일 수 있음 */
  experimental: {
    serverActions: {
      bodySizeLimit: "3mb",
    },
  },
  ...(useDevPolling
    ? {
        watchOptions: {
          /** 짧을수록 HMR 반응 빠름 (Docker 폴링 모드). CPU 약간 증가. */
          pollIntervalMs: 500,
        },
      }
    : {}),
  webpack: (config, { dev }) => {
    if (dev && disableWebpackCacheInDev) {
      config.cache = false;
    }
    return config;
  },
};

export default nextConfig;
