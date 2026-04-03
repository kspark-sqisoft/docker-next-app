/**
 * Node 서버 프로세스 기동 시 한 번 실행됩니다.
 * 환경 변수 검증은 `lib/env/server.ts` import 로 이루어집니다.
 * @see https://nextjs.org/docs/app/api-reference/file-conventions/instrumentation
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./lib/env/server");
  }
}
