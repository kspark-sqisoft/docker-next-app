import "dotenv/config";
import { hash } from "bcryptjs";
import { eq } from "drizzle-orm";
import { posts, users } from "./schema";
import { db, pool } from "../lib/db";

/** 시드 전용: 재실행 시 같은 id 를 upsert 하므로 글이 30개로 유지·갱신됩니다. */
const SEED_RANDOM_POST_IDS = [
  "dd9a4b23-3e82-4320-9641-5143ecc7cad9",
  "a2e5b6f5-4429-4de5-bd1e-53715107565a",
  "de5dc085-b81b-4da9-9a0c-84761000c327",
  "05724201-ffca-4921-b9c7-894e10aebe80",
  "7e7b464b-2aae-4198-ab11-baf55405d8dd",
  "6c2921d1-c765-4b47-af87-43aa58729bc8",
  "d44788c8-3adf-4e96-8d2a-e61f740eb51b",
  "3fb8abb5-262c-428a-aeb9-8ca6cd68dce9",
  "cf219d14-feb5-4c41-9f9f-c7b4690a7ed6",
  "e434f323-9737-4c69-8c87-f011a21f3cb7",
  "2c562279-338c-4c14-818b-ff4faacdeb5d",
  "724a3ea7-f7f6-4f7d-b889-401c6d12c7fe",
  "67571006-938f-4dc2-86c7-49cad641717d",
  "358879a8-b400-4bbc-8b2c-574d0845518f",
  "f95d3df2-6e5f-4e22-94d5-51953e791164",
  "ba3771c4-5d45-44dd-af5e-fe6a18a494f5",
  "4c9a5c51-93f7-48bb-aaa0-3b1ccb87f948",
  "ee32cbf6-53c8-4d48-9154-9542ab25d631",
  "86da6d07-7654-43e3-a717-455c84f27d34",
  "d79ba446-698e-46fb-8248-3d659c84d5f0",
  "3fde051a-b6e8-4c29-b957-35c1301ba063",
  "3277313c-bd2d-4ba1-9807-febb9d79a25e",
  "5599c0eb-a778-403c-8771-f5472c87851f",
  "2af6248c-e3e9-4d36-86f2-5ac87507b84d",
  "8e22b23a-edd2-4124-8b84-4e0922788b9e",
  "10d51b36-9f4c-4965-a531-923a874724b9",
  "8945b3c7-ade1-4f91-9d90-768cde1fbdc9",
  "057c5621-fae1-463e-98c1-fc9c214c4c5a",
  "19cd0507-e516-4b1c-991b-04ac4fe07ed0",
  "a9b43b9f-2a89-48f3-a1d9-154646e6917f",
] as const;

const TOPICS = [
  "Next.js App Router",
  "Drizzle ORM",
  "Docker Compose",
  "Server Action",
  "TanStack Query",
  "NextAuth JWT",
  "TypeScript",
  "PostgreSQL",
  "Edge Middleware",
  "REST Route Handler",
] as const;

const MOODS = [
  "메모",
  "질문",
  "정리",
  "실습 노트",
  "트러블슈팅",
  "아이디어",
] as const;

const SNIPPETS = [
  "오늘은 레이아웃과 로딩 경계를 나눠 봤다.",
  "DB URL 을 컨테이너 기준으로 맞추는 게 헷갈렸다.",
  "invalidateQueries 와 revalidatePath 를 같이 쓰는 느낌을 비교 중이다.",
  "시드 데이터로 목록 UI(스켈레톤·빈 상태)를 확인하기 좋다.",
  "에러 응답 포맷을 API 맞춰 두면 디버깅이 수월하다.",
  "프로덕션에서는 AUTH_SECRET 과 업로드 경로를 꼭 다시 점검하자.",
] as const;

function pick<T extends readonly unknown[]>(arr: T): T[number] {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

function buildRandomPost(index: number): { title: string; content: string } {
  const topic = pick(TOPICS);
  const mood = pick(MOODS);
  const title = `[시드] ${topic} · ${mood} #${index + 1}`;
  const lines = [
    `${pick(SNIPPETS)}`,
    `${pick(SNIPPETS)}`,
    `태그 느낌: ${topic} / ${mood}`,
    "",
    "(drizzle/seed.ts 가 만든 학습용 더미 글입니다.)",
  ];
  return { title: title.slice(0, 200), content: lines.join("\n") };
}

function isConnectionRefused(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as { code?: string; cause?: unknown };
  if (e.code === "ECONNREFUSED") return true;
  const c = e.cause;
  if (c && typeof c === "object" && "code" in c) {
    return (c as { code?: string }).code === "ECONNREFUSED";
  }
  return false;
}

function printConnectionHelp(): void {
  console.error(`
[seed] PostgreSQL 에 연결하지 못했습니다 (ECONNREFUSED).

  • Postgres 가 떠 있는지 확인하세요.
    예: docker compose -f docker-compose.dev.yml up -d db
  • 맥/윈도우 호스트에서 npm run db:seed 를 실행할 때 .env 의 DATABASE_URL 은
    컨테이너에 붙는 주소와 달라야 합니다.
    docker-compose.dev.yml 기준 예시:
    DATABASE_URL="postgresql://blog:blog@localhost:5433/blog"
  • 이미 web 컨테이너를 쓰는 경우 시드를 컨테이너 안에서 실행할 수도 있습니다:
    docker compose -f docker-compose.dev.yml exec web npm run db:seed
`);
}

async function main() {
  const email = "demo@example.com";
  const password = "demo12345";
  const passwordHash = await hash(password, 12);

  await db
    .insert(users)
    .values({
      id: crypto.randomUUID(),
      email,
      name: "Demo User",
      passwordHash,
    })
    .onConflictDoUpdate({
      target: users.email,
      set: { passwordHash, name: "Demo User" },
    });

  const user = await db.query.users.findFirst({
    where: eq(users.email, email),
  });
  if (!user) throw new Error("seed: demo user missing after upsert");

  const welcomeContent =
    "이 글은 drizzle/seed.ts 로 시드되었습니다.\n\n로그인: demo@example.com / demo12345";

  await db
    .insert(posts)
    .values({
      id: "00000000-0000-4000-8000-000000000001",
      title: "Welcome to Docker Next Blog",
      content: welcomeContent,
      authorId: user.id,
      imageUrls: [],
    })
    .onConflictDoUpdate({
      target: posts.id,
      set: {
        title: "Welcome to Docker Next Blog",
        content: welcomeContent,
        authorId: user.id,
      },
    });

  for (let i = 0; i < SEED_RANDOM_POST_IDS.length; i++) {
    const id = SEED_RANDOM_POST_IDS[i]!;
    const { title, content } = buildRandomPost(i);
    await db
      .insert(posts)
      .values({
        id,
        title,
        content,
        authorId: user.id,
        imageUrls: [],
      })
      .onConflictDoUpdate({
        target: posts.id,
        set: {
          title,
          content,
          authorId: user.id,
        },
      });
  }

  console.log("Seeded demo user:", email, "/", password);
  console.log(
    "Seeded welcome post +",
    SEED_RANDOM_POST_IDS.length,
    "random demo posts (fixed ids, content shuffled each run)",
  );
}

main()
  .then(() => pool.end())
  .catch(async (e) => {
    if (isConnectionRefused(e)) {
      printConnectionHelp();
    }
    console.error(e);
    await pool.end().catch(() => {});
    process.exit(1);
  });
