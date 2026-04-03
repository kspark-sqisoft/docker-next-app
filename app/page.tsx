import { redirect } from "next/navigation";

/** docker-app 과 같이 루트는 게시판으로 보냅니다. */
export default function HomePage() {
  redirect("/posts");
}
