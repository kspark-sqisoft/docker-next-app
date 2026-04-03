/** Prisma Json 필드 → 문자열 배열 */
export function imageUrlsFromDb(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((x): x is string => typeof x === "string");
}
