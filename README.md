# Notice Board (docker-next-app)

학습용 **로그인 기반 게시판** (Next.js 한 앱). UI·레이아웃은 `docker-app` 프론트(Notice Board, `max-w-2xl`, sticky 헤더, 배지 등)에 맞췄고, **개발용 / 운영용 Compose** 구성도 동일한 방식입니다. 루트 `/`는 `/posts`로 리다이렉트됩니다.

## 스택

- Next.js 16 (App Router), React 19  
- PostgreSQL 16, Prisma 7 (`@prisma/adapter-pg`, `pg` 풀)  
- NextAuth (Auth.js) Credentials + JWT 세션  
- Tailwind CSS v4, shadcn/ui (Base UI)  
- TanStack Query (글 목록·작성·수정 후 무효화)  
- Docker Compose (`docker-compose.yml` / `docker-compose.dev.yml`)
- 게시글 첨부 이미지(최대 5장·파일당 5MB), 프로필 아바타(2MB), 이름 수정 — `UPLOADS_DIR` 또는 `./uploads`에 저장 후 `/uploads/...` 로 제공

## 빠른 시작 (로컬, DB 없이 개발만)

```bash
cp .env.example .env
# DATABASE_URL 을 실제 Postgres에 맞게 수정
npx prisma migrate dev
npm run dev
```

브라우저: [http://localhost:3000](http://localhost:3000) → 자동으로 `/posts`(게시판)로 이동합니다.

## Docker

| 구분 | 파일 | 용도 |
|------|------|------|
| 운영 스타일 | `docker-compose.yml` | 멀티스테이지 이미지, `next start`에 해당하는 standalone 서버 |
| 개발 | `docker-compose.dev.yml` | 소스 볼륨 마운트, `next dev` |

PostgreSQL 호스트 포트는 **5433** (컨테이너 내부는 5432)로 두어, 로컬이나 다른 Compose의 5432와 겹치기 어렵게 했습니다.

```bash
# 운영 스타일
docker compose up -d --build
# http://localhost:3000

# 개발 (프로젝트 이름: docker-next-blog-dev)
docker compose -f docker-compose.dev.yml up
```

루트에 `.env`가 있으면 `AUTH_SECRET`, `DB_*` 등을 읽을 수 있습니다. 예시는 `.env.example`을 참고하세요.

## 시드 (데모 계정)

```bash
DATABASE_URL="postgresql://..." npm run db:seed
```

- 이메일: `demo@example.com`  
- 비밀번호: `demo12345`

## 문서

- [docs/STUDY-GUIDE.md](./docs/STUDY-GUIDE.md) — docker-app과의 대응, 디렉터리 구조, 단계별 학습 절차  
  - **Prisma**: 세팅 절차·파일 역할·공부 순서는 가이드 **§2.2** 참고  
  - **추가 학습 로드맵**: 액션·페이지네이션·테스트·CI 등 제안은 가이드 **§10**

## 주요 스크립트

| 명령 | 설명 |
|------|------|
| `npm run dev` | Next 개발 서버 |
| `npm run build` | `prisma generate` 후 프로덕션 빌드 |
| `npm run db:migrate` | 로컬에서 `prisma migrate dev` |
| `npm run db:deploy` | 배포/컨테이너에서 `prisma migrate deploy` |
| `npm run db:seed` | 시드 실행 |
