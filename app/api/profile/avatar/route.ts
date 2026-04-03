import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { users } from "@/drizzle/schema";
import { db } from "@/lib/db";
import { devLog } from "@/lib/dev-log";
import { saveProfileAvatar } from "@/lib/save-profile-avatar";

export async function POST(request: Request) {
  devLog("api:profile/avatar", "POST: start");
  const session = await auth();
  if (!session?.user?.id) {
    devLog("api:profile/avatar", "POST: 401");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  if (!file || !(file instanceof File)) {
    devLog("api:profile/avatar", "POST: 400 no file", {
      userId: session.user.id,
    });
    return NextResponse.json({ error: "file is required" }, { status: 400 });
  }

  devLog("api:profile/avatar", "POST: upload", {
    userId: session.user.id,
    size: file.size,
    type: file.type,
  });
  const result = await saveProfileAvatar(session.user.id, file);
  if (!result.ok) {
    devLog("api:profile/avatar", "POST: save failed", {
      userId: session.user.id,
      error: result.error,
    });
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, session.user.id),
    columns: {
      id: true,
      email: true,
      name: true,
      profileImageUrl: true,
    },
  });

  devLog("api:profile/avatar", "POST: ok", { userId: session.user.id });
  return NextResponse.json(user);
}
