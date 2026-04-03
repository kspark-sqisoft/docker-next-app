# Docker Next Blog — 학습 가이드

> **브랜치 `drizzle`**: 앱 코드는 **Drizzle ORM**(`drizzle/schema.ts`, `lib/db.ts`, `drizzle-kit migrate`)을 씁니다. 아래 본문은 `main`(Prisma)과 docker-app을 비교하는 흐름이라 Prisma 설명이 많이 남아 있습니다. Drizzle만 보려면 `README.md`와 `drizzle/` 디렉터리를 우선하세요.

이 문서는 `docker-app`(Nest 백엔드 + Vite 프론트 + TypeORM)과 **같은 문제를 Next.js 한 프로젝트**로 풀면서, Docker·Prisma·인증·프론트 데이터 계층을 **순서대로** 이해할 수 있게 정리했습니다.

---

## 0. UI·레이아웃 (docker-app 프론트 정렬)

- 브랜드: **Notice Board** + `MessageSquareText` 아이콘, 헤더 우측 Dev/Prod·스택 배지(Next.js / App Router).
- **sticky** 상단 바, `backdrop-blur`, 본문 **`max-w-2xl`** · `px-3`/`sm:px-4` 여백은 `RootLayout` 과 동일 패턴.
- 라우트별 **페이지 제목**(`PageTitleHeading`)은 docker-app 의 `handle.title` 과 같은 역할로 경로 매핑.
- 게시판 목록(`/posts`) 상단 안내 + `Separator` 는 `PostsLayout` 과 동일한 조건부 블록.
- 글 목록: **h2「글 목록」** + 작성 버튼·건수·스켈레톤·빈 상태(Inbox) 카드 — docker-app `PostList` 와 같은 정보 구조.

---

## 1. docker-app과 무엇이 같고 무엇이 다른가

### 1.1 비슷한 점

| docker-app | docker-next-app (이 저장소) |
|------------|----------------------------|
| PostgreSQL + Compose로 DB | 동일. 호스트 포트는 **5433**으로 분리해 다른 Postgres와 충돌을 줄임 |
| `User`(이메일·비밀번호 해시·이름), `Post`(제목·본문·작성자) | Prisma로 동일 도메인 + `User.profileImageUrl`, `Post.imageUrls`(JSON) |
| JWT/세션 기반 로그인 후 글 CRUD | NextAuth + JWT 세션, Route Handler로 REST 형태 API (`/api/posts` 등) |
| `POST /posts/images`, 프로필 PATCH·아바타 | `POST /api/posts/images`, `PATCH /api/profile`, `POST /api/profile/avatar` (쿠키 세션) |
| 정적 `/uploads` | `app/uploads/[[...path]]/route.ts` GET + 디스크 `UPLOADS_DIR` (docker-app 의 express.static 과 동일 역할) |
| 개발/운영 Compose 분리 | `docker-compose.dev.yml`(이름: `docker-next-blog-dev`) / `docker-compose.yml` |

### 1.2 다른 점

- **한 코드베이스**: API가 Route Handler, 화면은 RSC/클라이언트 컴포넌트로 같은 Next 앱 안에 있음.
- **ORM**: TypeORM 엔티티 대신 **Prisma 스키마** + 마이그레이션.
- **Prisma 7**: PostgreSQL 연결에 **`@prisma/adapter-pg` + `pg` Pool**이 필요합니다. 생성된 클라이언트는 `app/generated/prisma`에 있으며, `lib/prisma.ts`에서 어댑터를 붙입니다.
- **Edge 미들웨어**: `middleware.ts`는 Edge에서 실행되므로 **Prisma를 직접 import 할 수 없습니다**. 그래서 `auth.config.ts`(DB 없음)와 `auth.ts`(실제 `authorize`에서 Prisma 사용)로 나눴습니다.

---

## 2. 디렉터리와 역할

```
app/
  api/                 # Route Handlers (REST)
  posts/               # 블로그 페이지
  login/, register/
  layout.tsx           # Providers + SiteHeader
  generated/prisma/    # Prisma Client 생성물 (gitignore, postinstall로 생성)
actions/               # "use server" — 폼·뮤테이션용 Server Actions (프로필·글 등록)
auth.ts                # NextAuth 설정 + Credentials authorize (DB)
auth.config.ts         # Edge용 공통 설정(세션·JWT 콜백, 더미 authorize)
middleware.ts          # /posts/new, /posts/:id/edit 보호
components/
  providers.tsx        # SessionProvider + QueryClientProvider
  posts/post-list.tsx  # TanStack Query 예시
lib/
  env/server.ts        # Zod 로 DATABASE_URL·AUTH_SECRET 등 검증 (서버 전용)
  prisma.ts            # PrismaClient + PrismaPg 어댑터 (`serverEnv.DATABASE_URL`)
  uploads.ts           # `serverEnv.UPLOADS_DIR`
  validations/post.ts  # 글 Zod 스키마 — GET/POST/PATCH API + create/update 액션 공유
  button-variants.ts   # 서버 컴포넌트에서도 쓰는 cva (Button은 "use client")
instrumentation.ts     # Node 런타임에서 `lib/env/server` 선로드
prisma/
  schema.prisma
  migrations/
  seed.ts
docker/
  prod-entrypoint.sh   # migrate deploy → node server.js
  dev-entrypoint.sh    # migrate deploy → next dev
```

### 2.1 Route Handler vs Server Action (실무에서 자주 나뉘는 기준)

| | **Route Handler** (`app/api/.../route.ts`) | **Server Action** (`actions/*.ts`, `"use server"`) |
|---|-------------------------------------------|-----------------------------------------------------|
| **호출** | `fetch`, 모바일 앱, 외부 웹훅, Postman | 주로 같은 앱의 `<form action={…}>` 또는 `useActionState` |
| **계약** | URL·메서드·JSON 스키마가 API 문서화에 맞음 | 함수 시그니처·`FormData` 필드명이 계약 |
| **이 저장소** | `GET/POST/PATCH/DELETE /api/posts`·`[id]`, 이미지 업로드 등 | 프로필(`actions/profile.ts`), 글 `createPost`·`updatePost`·`deletePost`(`actions/posts.ts`) |

**둘 다** 서버에서 `auth()`·Prisma·`revalidatePath`를 쓸 수 있습니다. 목록은 TanStack Query로 `GET /api/posts`를 쓰고, 글 **작성·수정·삭제 폼**은 서버 액션으로, **동일 도메인 로직**은 Route Handler에도 남겨 REST와 비교할 수 있게 해 두었습니다.

#### 코드 조각 — 글 생성: Route Handler vs Server Action

**Route Handler** (`app/api/posts/route.ts`): `GET`/`POST` 등 HTTP 메서드별 함수 export, `Request` / `NextResponse`, JSON 본문.

```typescript
// app/api/posts/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// GET: ?cursor=<postId>&limit=15 → { items, nextCursor } (한 페이지에 limit개, take는 limit+1로 다음 존재 여부 판별)
export async function GET(request: Request) {
  // prisma.post.findMany({ orderBy: [{ createdAt: "desc" }, { id: "desc" }], take, skip+cursor… })
  return NextResponse.json({ items: PostJson[], nextCursor: string | null });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const json = await request.json();
  // zod(createSchema) → sanitizeImageUrls → prisma.post.create → 201 + JSON
  return NextResponse.json(serializePost(post), { status: 201 });
}
```

**Server Action** (`actions/posts.ts`): 파일 맨 위 `"use server"`. 폼에서는 `FormData`로 들어온 값을 읽고, React 19 `useActionState`와 맞추려 `(prevState, formData) => nextState` 형태로 반환합니다.

```typescript
// actions/posts.ts
"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function createPost(
  _prev: CreatePostState | undefined,
  formData: FormData,
): Promise<CreatePostState> {
  const session = await auth();
  if (!session?.user?.id) return { error: "로그인이 필요합니다." };

  const title = formData.get("title");
  const content = formData.get("content");
  // fieldsSchema 검증 → imageUrlsJson 파싱 → sanitize → prisma.post.create
  revalidatePath("/posts");
  revalidatePath(`/posts/${post.id}`);
  return { postId: post.id };
}
```

**클라이언트 — REST + TanStack Query** (목록): `useInfiniteQuery` + 커서, **`fetchNextPage` 는「더 불러오기」버튼**으로만 호출(스크롤 자동 로드 없음 — 문구·로딩 상태를 천천히 확인하기 좋게).

```typescript
// components/posts/post-list.tsx
useInfiniteQuery({
  queryKey: ["posts"],
  queryFn: ({ pageParam }) => fetch(`/api/posts?limit=6&cursor=${pageParam ?? ""}`).then((r) => r.json()),
  initialPageParam: undefined,
  getNextPageParam: (last) => last.nextCursor ?? undefined,
});
// pages.flatMap((p) => p.items); 버튼 onClick → fetchNextPage()
```

**글 상세 — 좋아요 + 낙관적 UI** (`components/posts/post-like-bar.tsx`, `POST /api/posts/[id]/like`): DB에는 `PostLike`(사용자·글 복합 유니크)로 저장하고, 화면은 **먼저 캐시를 바꾼 뒤** 서버에 `fetch`합니다. TanStack Query `useMutation`의 **`onMutate`**에서 `queryClient.setQueryData`로 `likeCount`·`likedByMe`를 즉시 반영하고, **`onError`**에서 이전 스냅샷으로 되돌리며, **`onSuccess`**에서 서버 JSON으로 캐시를 확정합니다. RSC(`app/posts/[id]/page.tsx`)는 초기 `likeCount`/`likedByMe`를 Prisma로 넘겨 `useQuery`의 `initialData`와 맞춥니다.

**클라이언트 — 서버 액션 + 폼** (새 글): `action`에 서버 함수를 넘기면 Next가 POST로 액션을 호출합니다. 배열 같은 값은 숨은 필드로 직렬화하는 패턴이 흔합니다.

```typescript
// app/posts/new/new-post-form.tsx
const [postState, postAction, postPending] = useActionState(createPost, {});

return (
  <form action={postAction}>
    <input type="hidden" name="imageUrlsJson" value={JSON.stringify(imageUrls)} readOnly />
    <Input name="title" value={title} onChange={(e) => setTitle(e.target.value)} />
    <Textarea name="content" value={content} onChange={(e) => setContent(e.target.value)} />
    <Button type="submit" disabled={postPending}>등록</Button>
  </form>
);
```

**글 수정·삭제**도 서버 액션(`updatePost`·`deletePost`) + `useActionState`; `postId`는 `bind(null, postId)`로 고정합니다. 삭제는 별도 `<form action={deleteAction}>`(중첩 폼 불가). REST `PATCH`/`DELETE`는 API에 그대로 있습니다.

```typescript
// app/posts/[id]/edit/edit-post-form.tsx
const [updateState, updateAction, updatePending] = useActionState(
  updatePost.bind(null, postId),
  {},
);
const [deleteState, deleteAction, deletePending] = useActionState(
  deletePost.bind(null, postId),
  {});

// 성공 시 목록 캐시 무효화 + router.push (서버 액션은 revalidatePath 도 수행)
useEffect(() => {
  if (updateState?.success) {
    void queryClient.invalidateQueries({ queryKey: ["posts"] });
    router.push(`/posts/${postId}`);
  }
}, [updateState?.success, postId, queryClient, router]);
```

### 2.2 Prisma — 이 저장소 세팅 절차와 공부 순서

TypeORM 대신 **Prisma**로 `User` / `Post`를 다룹니다. **Prisma 7**은 PostgreSQL에 **드라이버 어댑터**(`@prisma/adapter-pg`)와 **`pg` 풀**을 붙여 클라이언트를 만드는 패턴이 기본에 가깝습니다.

#### 파일이 각각 하는 일

| 경로 | 역할 |
|------|------|
| `prisma/schema.prisma` | 모델·필드·`@@map` / `@map`으로 DB 테이블·컬럼명 매핑. `generator client`의 **`output`** 으로 클라이언트 생성 위치를 `app/generated/prisma`로 지정 |
| `prisma.config.ts` | Prisma CLI 설정. **`datasource.url`** 은 여기서 `DATABASE_URL`(환경 변수)을 읽음 — 스키마 파일 안에 `url = env("...")` 를 두지 않는 Prisma 7 스타일 |
| `prisma/migrations/` | `migrate dev`가 만든 SQL 이력. **스키마와 실제 DB를 맞추는 근거**가 되므로 diff를 읽어 보는 것이 좋음 |
| `prisma/seed.ts` | `npm run db:seed` 시 데모 유저·글 삽입 (`package.json`의 `prisma.seed`) |
| `lib/prisma.ts` | 앱 런타임용 **싱글톤** `PrismaClient`: `Pool` → `PrismaPg` 어댑터 → `new PrismaClient({ adapter })`. 개발 시 핫 리로드로 인스턴스가 늘지 않게 `globalThis`에 캐시 |
| `app/generated/prisma/` | `prisma generate` 결과물(gitignore). `import { PrismaClient } from "@/app/generated/prisma/client"` 형태로 사용 |

#### 처음 로컬에 올릴 때 (권장 순서)

1. **저장소 클론 후** `cp .env.example .env` (또는 동일 키를 수동 작성).
2. **Postgres**를 띄움(로컬 설치, 또는 이 repo의 `docker compose`로 `db`만 사용해도 됨).
3. `.env`의 **`DATABASE_URL`** 을 실제 DB에 맞게 설정.  
   - Compose로 앱+DB를 같이 쓸 때: 앱 컨테이너 기준 호스트는 보통 **`db`**, 포트 **`5432`**.  
   - 호스트 머신에서 `psql` 등으로 붙을 때만 README에 적힌 **`localhost:5433`** 같은 **퍼블리시 포트**를 씀(§9 참고).
4. `npm install` — **`postinstall`에서 `prisma generate`**가 돌아가 `app/generated/prisma`가 생김(DB 없이도 생성 가능).
5. 스키마와 DB를 맞춤: **`npm run db:migrate`** (`prisma migrate dev`). 이름을 물어보면 변경 내용에 맞게 입력.
6. (선택) **`npm run db:seed`** 로 데모 계정·글 입력.
7. **`AUTH_SECRET`** 을 `.env`에 넣은 뒤 `npm run dev`.

DB 연결 없이 **타입·import만** 보고 싶을 때는 4번까지(`generate`)로도 충분합니다.

#### 스키마를 바꾼 뒤 (일상 워크플로)

1. `prisma/schema.prisma` 수정.
2. `npm run db:migrate` — 로컬 DB에 적용할 마이그레이션 SQL 생성·적용.
3. 필요하면 시드나 수동 SQL로 데이터 보정.
4. `prisma/migrations/…/migration.sql`을 열어 **어떤 DDL이 나갔는지** 확인하는 습관을 들이면 실무와 가깝습니다.

**배포·Docker**에서는 소스에 있는 마이그레이션만 적용: `npm run db:deploy` (`prisma migrate deploy`). 새 마이그레이션은 항상 로컬에서 만든 뒤 커밋합니다.

#### 자주 쓰는 npm 스크립트

| 명령 | 설명 |
|------|------|
| `npm run db:generate` | 클라이언트만 재생성 (`prisma generate`) |
| `npm run db:migrate` | 개발 DB에 마이그레이션 생성·적용 (`migrate dev`) |
| `npm run db:deploy` | 기존 마이그레이션만 순서대로 적용 (`migrate deploy`) |
| `npm run db:studio` | 브라우저 UI로 테이블 조회·편집(로컬 학습용) |
| `npm run db:seed` | `prisma/seed.ts` 실행 |

#### Prisma만 골라 공부할 때 추천 순서

1. `prisma/schema.prisma`에서 모델·관계·JSON 필드(`Post.imageUrls`) 읽기.
2. 최신 `prisma/migrations/*/migration.sql` 한 개를 읽고 테이블 정의와 대응시키기.
3. `lib/prisma.ts`에서 **왜 Pool + adapter**인지 정리해 보기.
4. 서버 코드 한 군데(예: `app/api/posts/route.ts` 또는 `auth.ts`의 `authorize`)를 따라가며 `prisma.*` 호출 흐름 보기.
5. `middleware.ts`에는 Prisma를 **넣지 않는 이유**(Edge 런타임)를 §1.2와 연결해 이해하기.

#### 코드 조각 — Prisma 스키마 · 클라이언트 생성 위치 · 런타임 연결

**스키마** (`prisma/schema.prisma`): 모델과 DB 테이블 매핑, 클라이언트 출력 경로.

```prisma
generator client {
  provider = "prisma-client"
  output   = "../app/generated/prisma"
}

datasource db {
  provider = "postgresql"
}

model User {
  id       String @id @default(uuid())
  email    String @unique
  posts    Post[]
  @@map("users")
}

model Post {
  id        String @id @default(uuid())
  authorId  String? @map("author_id")
  author    User?   @relation(fields: [authorId], references: [id])
  imageUrls Json    @default("[]") @map("image_urls")
  @@map("posts")
}
```

(실제 `prisma/schema.prisma`에는 `passwordHash`, `profileImageUrl`, `@db.VarChar` 등이 더 있습니다. 관계·`@@map` 패턴만 빠르게 보는 용도입니다.)

**CLI 설정** (`prisma.config.ts`): Prisma 7에서 datasource URL을 여기서 읽는 예시.

```typescript
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: { url: process.env["DATABASE_URL"] },
});
```

**앱에서의 클라이언트** (`lib/prisma.ts`): `pg` 풀 + `@prisma/adapter-pg`, 개발 시 싱글톤 캐시.

```typescript
import { PrismaClient } from "@/app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { serverEnv } from "@/lib/env/server";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

function createPrismaClient() {
  const pool = new Pool({ connectionString: serverEnv.DATABASE_URL });
  return new PrismaClient({ adapter: new PrismaPg(pool) });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();
if (serverEnv.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

### 2.3 서버 환경 변수 검증 (`lib/env/server.ts`)

- **Zod**로 `DATABASE_URL`(PostgreSQL URL 형태), `AUTH_SECRET`, 선택 `AUTH_URL`·`UPLOADS_DIR` 를 검증합니다.
- **프로덕션**(`NODE_ENV=production`)에서는 `AUTH_SECRET` **32자 미만이면 실패**합니다.
- 모듈이 **처음 import 될 때** `parse` 하므로, 잘못된 값은 앱·시드·빌드(Prisma import 경로)에서 빨리 드러납니다.
- **`instrumentation.ts`**: `NEXT_RUNTIME === "nodejs"` 일 때만 `lib/env/server` 를 불러 **서버 기동 직후**에도 검증이 돌아가게 했습니다.
- **Edge·`middleware.ts`** 에서는 이 파일을 **import 하지 않습니다**(미들웨어 번들·검증 범위 분리).

---

## 3. 절차 1 — 로컬에서 DB 없이 구조만 보기

1. `npm install`
2. `npx prisma generate` (스키마만 있으면 DB 연결 없이 생성 가능; 보통은 `postinstall`으로 이미 실행됨)
3. Postgres를 띄운 뒤 `.env`에 `DATABASE_URL` 설정
4. `npm run db:migrate` (`prisma migrate dev`)로 마이그레이션 적용
5. `AUTH_SECRET` 을 `.env`에 넣고(32자 이상 권장) `npm run dev`

**Prisma를 처음부터 차근차근 보려면 위 §2.2를 먼저 읽는 것을 권장합니다.**

---

## 4. 절차 2 — 인증 흐름 이해하기

1. **회원가입**: `POST /api/register` → `bcryptjs`로 해시 저장.
2. **로그인**: `signIn("credentials", …)` → `auth.ts`의 `authorize`가 Prisma로 사용자 조회 후 비밀번호 비교.
3. **세션**: JWT 전략. `auth.config.ts`의 `jwt` / `session` 콜백으로 `session.user.id`를 채움.
4. **보호 경로**: `middleware.ts`는 **Edge**이므로 `NextAuth(authConfig)`만 사용. 쿠키의 JWT만 검사해 로그인 여부를 판단합니다.
5. **API 보호**: `POST /api/posts`, `PATCH/DELETE /api/posts/[id]` 등에서 `auth()`로 서버 측 세션을 다시 확인합니다.

#### 코드 조각 — Edge용 설정 vs Node에서 Prisma 쓰는 로그인

**미들웨어 전용** (`auth.config.ts`): Prisma를 import하지 않습니다. Credentials의 `authorize`는 더미(`null`만 반환)로 두고, JWT/session 콜백 형태만 공유합니다.

```typescript
// auth.config.ts — Edge(middleware)에서 사용
export default {
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 7 },
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      authorize: async () => null,
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.email = user.email;
        token.name = user.name;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) session.user.id = token.sub as string;
      return session;
    },
  },
} satisfies NextAuthConfig;
```

**실제 로그인** (`auth.ts`): `...authConfig`를 펼치고, 같은 Credentials에 **진짜 `authorize`**에서 `prisma.user.findUnique` + `bcrypt.compare`를 실행합니다.

```typescript
// auth.ts — Route Handler / Server Action / RSC에서 쓰는 auth()
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      authorize: async (credentials) => {
        const parsed = z
          .object({ email: z.string().email(), password: z.string().min(1) })
          .safeParse(credentials);
        if (!parsed.success) return null;

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email },
          select: { id: true, email: true, name: true, passwordHash: true },
        });
        if (!user || !(await compare(parsed.data.password, user.passwordHash))) {
          return null;
        }
        return { id: user.id, email: user.email, name: user.name };
      },
    }),
  ],
});
```

**보호 라우트** (`middleware.ts`): `NextAuth(authConfig)`만으로 래핑 — DB 없이 쿠키·JWT만으로 로그인 여부 판단.

```typescript
// middleware.ts
const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const isAuthed = !!req.auth;
  if (req.nextUrl.pathname === "/posts/new" && !isAuthed) {
    return Response.redirect(new URL("/login", req.url));
  }
  return undefined;
});

export const config = {
  matcher: ["/posts/new", "/posts/:id/edit", "/profile"],
};
```

**API 한 줄 검사** (예: `app/api/posts/route.ts`): 서버에서 다시 `auth()`로 세션 확인.

```typescript
const session = await auth();
if (!session?.user?.id) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
```

---

## 5. 절차 3 — TanStack Query를 어디에 썼는지

- **글 목록** (`components/posts/post-list.tsx`): `useInfiniteQuery` + 커서 API, 다음 묶음은 **더 불러오기** 버튼으로 `fetchNextPage`.
- **새 글**: `createPost` + `useActionState`; 성공 시 `invalidateQueries` 후 상세로 이동.
- **수정 / 삭제**: `updatePost`·`deletePost` + `useActionState`; 성공 시 `invalidateQueries` + `router.push`·`refresh`. (`revalidatePath`는 액션 안에서도 호출됨.)
- 서버 컴포넌트만으로도 가능하지만, **클라이언트 캐시·로딩·재시도**를 연습하려고 Query를 넣었습니다.

#### 코드 조각 — `useQuery` / 무효화

```typescript
// 무한 스크롤 목록은 queryKey: ["posts"] 한 가지로 묶고, 성공 후 전체를 리셋
void queryClient.invalidateQueries({ queryKey: ["posts"] });
```

## 5.1 프로필 — Server Actions + `useActionState`

- `app/profile/profile-form.tsx`: 이름은 `updateProfileName`, 아바타는 `uploadProfileAvatar` (`actions/profile.ts`).
- 세션 UI 갱신을 위해 `useSession().update`와 `router.refresh()`를 성공 시 호출합니다.
- `POST /api/profile/avatar`는 `saveProfileAvatar`를 공유하는 REST 경로로 남아 있어, **동일 비즈니스 로직을 API vs 액션**으로 나란히 볼 수 있습니다.

#### 코드 조각 — 프로필 이름 서버 액션 + `useActionState`

```typescript
// actions/profile.ts
"use server";

export async function updateProfileName(
  _prev: UpdateProfileNameState | undefined,
  formData: FormData,
): Promise<UpdateProfileNameState> {
  const session = await auth();
  if (!session?.user?.id) return { error: "로그인이 필요합니다." };

  const raw = formData.get("name");
  if (typeof raw !== "string") return { error: "이름을 입력해 주세요." };
  const parsed = nameSchema.safeParse({ name: raw.trim() });
  if (!parsed.success) return { error: "이름은 1~100자여야 합니다." };

  await prisma.user.update({
    where: { id: session.user.id },
    data: { name: parsed.data.name },
  });
  revalidatePath("/profile");
  revalidatePath("/posts");
  return { success: true, name: parsed.data.name };
}
```

```typescript
// app/profile/profile-form.tsx (요지)
const [nameState, nameAction, namePending] = useActionState(updateProfileName, {});

useEffect(() => {
  if (nameState?.success && nameState.name) {
    void update({ name: nameState.name });
    router.refresh();
  }
}, [nameState, update, router]);

<form action={nameAction}>
  <Input name="name" value={name} onChange={(e) => setName(e.target.value)} />
  <Button type="submit" disabled={namePending}>이름 저장</Button>
</form>
```

아바타는 같은 패턴으로 `<form action={avatarAction}>` + `input type="file" name="file"` + 선택 시 `requestSubmit()`으로 서버 액션(`uploadProfileAvatar`)에 `multipart/form-data`를 넘깁니다.

---

## 6. 절차 4 — Docker 운영 스타일 (`docker-compose.yml`)

1. **빌드**: `Dockerfile`  
   - `deps` 단계에서 `prisma` 폴더를 먼저 복사한 뒤 `npm ci` → `postinstall`의 `prisma generate`가 실패하지 않게 함.  
   - `builder`에서 `next build` (standalone 출력).  
   - `runner`에 standalone + `prisma` + `prisma.config.ts` + `app/generated` 복사.  
   - **마이그레이션 CLI**: standalone 추적 범위 밖이라, 러너에서 `npm install prisma@7.6.0`으로 CLI를 추가 설치합니다.
2. **시작**: `docker/prod-entrypoint.sh`가 `npx prisma migrate deploy` 후 `node server.js` 실행.
3. **환경 변수**: Compose에서 `DATABASE_URL`, `AUTH_SECRET`, `AUTH_URL` 전달. 프로덕션에서는 `AUTH_SECRET`을 반드시 강한 랜덤 값으로 바꿉니다.

```bash
docker compose up -d --build
```

---

## 7. 절차 5 — Docker 개발 스타일 (`docker-compose.dev.yml`)

1. 이미지는 `Dockerfile.dev`로만 의존성을 설치합니다(역시 `prisma` 디렉터리를 먼저 복사).
2. 소스는 **볼륨** `./:/app`으로 마운트하고, `node_modules`는 **이름 있는 볼륨** `web_node_modules`로 호스트와 섞이지 않게 합니다.
3. `docker/dev-entrypoint.sh`: `prisma migrate deploy` → `next dev --hostname 0.0.0.0`.

```bash
docker compose -f docker-compose.dev.yml up
```

의존성을 바꾼 뒤 이상하면 `docker compose -f docker-compose.dev.yml down -v` 후 다시 올려 볼륨을 초기화할 수 있습니다.

---

## 8. 절차 6 — 시드와 데모 로그인

```bash
# DATABASE_URL 이 맞는지 확인
npm run db:seed
```

- `demo@example.com` / `demo12345`  
- 고정 UUID로 환영 글 1개를 `upsert` 합니다.

---

## 9. 자주 막히는 지점

- **5433 vs 5432**: 앱이 컨테이너 안에서 DB에 붙을 때는 **호스트명 `db`, 포트 5432**입니다. 맥/윈도우 호스트에서 `psql`로 접속할 때만 **localhost:5433**입니다.
- **`DATABASE_URL` 오타·SSL**: 로컬 Postgres는 보통 `postgresql://USER:PASS@HOST:PORT/DB` 형태. 클라우드 DB는 `?sslmode=require` 등이 필요할 수 있음.
- **`prisma generate` / 클라이언트 경로**: 스키마의 `output`이 `app/generated/prisma`이므로 import는 `@/app/generated/prisma/client`를 따름. 생성물이 없으면 `npm run db:generate` 실행.
- **마이그레이션 드리프트**: 원격 DB를 수동으로 고친 뒤 `migrate dev`가 막히면, 팀 규칙에 맞게 되돌리거나 baseline을 맞추는 절차가 필요함(학습 단계에서는 로컬 DB를 초기화하는 것이 단순함).
- **`AUTH_SECRET` 누락·짧음**: `lib/env/server.ts` 검증에 걸리면 터미널에 `[env] 서버 환경 변수 검증 실패` 와 `fieldErrors` 가 출력됩니다. 프로덕션에서는 **32자 이상**이어야 합니다.
- **shadcn Button과 서버 컴포넌트**: `components/ui/button.tsx`는 `"use client"`라서, 서버 페이지에서는 **`lib/button-variants.ts`의 `buttonVariants`**로 링크 스타일을 맞춥니다.
- **Next.js 16 경고**: `middleware` 관련 “proxy” 안내는 프레임워크 쪽 메시지이며, 현재 패턴은 공식 Auth.js 분리 설정과 동일한 방향입니다.

---

## 10. 추가하면 좋은 학습 주제 (로드맵)

아래는 **공부용**으로 이 저장소에 덧붙이면 효율이 큰 주제들입니다.  
**이미 갖춘 것**(참고): App Router, Prisma 7 + 어댑터, NextAuth(`auth.config` / `auth` 분리), Route Handler vs Server Action, TanStack Query, Docker Compose(dev/prod), 업로드·프로필, `lib/dev-log` 흐름 로그, `STUDY-GUIDE` 코드 스니펫 등.

### 10.1 흐름·아키텍처

1. **목록 페이지네이션**  
   `findMany` + `skip`/`take` 또는 커서 기반으로 바꾸면 **DB 인덱스**, **N+1**, **캐시 키 설계**를 연습할 수 있습니다.  
   (글 수정·삭제는 이미 Server Action + `invalidateQueries` 조합입니다. **`revalidatePath`만으로 목록이 충분한지** Query를 줄여 보며 비교해 볼 수 있습니다.)

2. **RSC에서 목록 한 번 가져오기**  
   `post-list`를 `useQuery`만 쓰지 않고, 상위를 서버 컴포넌트에서 `prisma.post.findMany`로 받은 뒤 클라이언트는 보조만 하게 하는 변형을 추가하면 **언제 RSC vs 클라이언트 캐시**인지가 선명해집니다.

3. **공통 검증 레이어** — **적용됨:** `lib/validations/post.ts`에 `postCreateBodySchema`, `postUpdateBodySchema`, `postListQuerySchema`, `postFormFieldsSchema`, `parsePostImageUrlsFromFormJson` 등을 두고 `app/api/posts`·`actions/posts.ts`가 같이 사용합니다. 프로필·회원가입은 별도 파일로 옮기며 같은 패턴을 확장해 볼 수 있습니다.

### 10.2 품질·실무 습관

4. **테스트**  
   - `lib`의 순수 함수(이미지 URL 검증 등): **Vitest**  
   - 로그인 → 글 작성: **Playwright** 한 시나리오만  
   CI 없이 로컬만이어도 “테스트가 설계를 바꾼다”는 감각을 익히기에 충분합니다.

5. **CI 한 줄**  
   GitHub Actions에서 `lint` + `build`(또는 `test`)만 돌려도 **배포 전 검증** 개념이 잡힙니다.

6. **에러·로딩 UI**  
   `app/posts/error.tsx`, `loading.tsx`, 필요 시 `notFound()` — App Router의 **경계(boundary)** 를 문서 한 절과 함께 넣기 좋습니다.

7. **환경 변수 검증** — **적용됨:** `lib/env/server.ts` + 루트 `instrumentation.ts`. 클라이언트 번들용 `NEXT_PUBLIC_*` 가 늘어나면 `lib/env/client.ts` 패턴으로 나누는 연습을 이어갈 수 있습니다.

### 10.3 보안·운영(가볍게)

8. **로그인·회원가입 레이트 리밋**  
   메모리 기반 간단 카운터만으로도 **브루트포스·스팸** 개념과 연결해 생각할 수 있습니다.

9. **`next.config` 보안 헤더**  
    CSP는 부담되면 **X-Frame-Options**, **Referrer-Policy** 정도만 — “배포 시 무엇을 신경 쓰는지” 수준의 학습에 적합합니다.

10. **낙관적 업데이트(Optimistic UI)**  
    작은 뮤테이션에 `useMutation`의 `onMutate`를 쓰면 **TanStack Query 심화**로 이어집니다.

### 10.4 문서만으로도 가치 있는 것

11. **결정 기록(ADR 스타일)**  
    이 가이드에 짧은 절을 추가해 **왜 JWT인지**, **왜 Edge에서 Prisma를 빼는지**, **언제 API vs Server Action**인지를 적어 두면, 나중에 포트폴리오·면접에서 설명하기 좋습니다.

### 10.5 추천 우선순위 (공부 대비 효율)

1. **`revalidatePath`만**으로 목록 갱신이 되는지 vs **`invalidateQueries` 유지** — 수정·삭제 액션에서 Query 호출을 제거해 보며 비교  
2. **다른 도메인 검증 파일 분리** (예: `lib/validations/profile.ts`, `register.ts`)  
3. **Playwright** 또는 **Vitest** 중 하나  
4. **페이지네이션** 또는 **RSC 목록 변형** 중 하나  

### 10.6 더 나아가는 확장 (도메인·인프라)

- docker-app처럼 **리프레시 토큰·쿠키** 기반 세션 연장  
- **객체 스토리지**(S3 등)로 업로드 이전  
- **RBAC** 또는 **공개/비공개 글** 플래그  

이 저장소는 위 로드맵 전 **최소 학습 코어**에 맞춰 두었으며, §10은 **다음에 무엇을 붙일지** 정렬용 체크리스트로 쓰면 됩니다.
