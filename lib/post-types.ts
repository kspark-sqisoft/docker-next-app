/** API 응답과 맞춘 클라이언트용 타입 */
export type PostAuthor = {
  id: string;
  name: string;
  email: string;
  profileImageUrl: string | null;
};

export type PostJson = {
  id: string;
  title: string;
  content: string;
  imageUrls: string[];
  authorId: string | null;
  createdAt: string;
  updatedAt: string;
  author: PostAuthor | null;
  /** GET /api/posts/[id] 에만 포함 */
  likeCount?: number;
  /** GET /api/posts/[id] — 로그인 시에만 의미 있음 */
  likedByMe?: boolean;
};

/** GET /api/posts?cursor=&limit= — 커서 기반 페이지 */
export type PostsPageJson = {
  items: PostJson[];
  nextCursor: string | null;
};
