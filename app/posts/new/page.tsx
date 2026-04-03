import Link from "next/link";
import { NewPostForm } from "./new-post-form";
import { buttonVariants } from "@/lib/button-variants";
import { cn } from "@/lib/utils";

export const metadata = { title: "글 작성" };

export default function NewPostPage() {
  return (
    <div className="space-y-6">
      <Link
        href="/posts"
        className={cn(
          buttonVariants({ variant: "ghost", size: "sm" }),
          "gap-1 px-0",
        )}
      >
        ← 목록
      </Link>
      <div>
        <p className="text-muted-foreground text-sm">
          이미지는 업로드 후 URL이 글과 함께 저장됩니다.
        </p>
      </div>
      <NewPostForm />
    </div>
  );
}
