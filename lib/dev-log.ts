/**
 * 학습용 흐름 로그. 프로덕션(`NODE_ENV === "production"`)에서는 출력하지 않습니다.
 * 민감값(비밀번호, 토큰 본문 등)은 절대 넣지 마세요.
 */
export function devLog(
  scope: string,
  message: string,
  details?: Record<string, unknown>,
): void {
  if (process.env.NODE_ENV === "production") return;
  const prefix = `[${scope}]`;
  if (details !== undefined && Object.keys(details).length > 0) {
    console.log(prefix, message, details);
  } else {
    console.log(prefix, message);
  }
}
