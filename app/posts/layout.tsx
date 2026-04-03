import { PostsIntro } from "./posts-intro";

export default function PostsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <PostsIntro />
      {children}
    </>
  );
}
