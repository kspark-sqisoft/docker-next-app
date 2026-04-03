import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/auth";
import { users } from "@/drizzle/schema";
import { db } from "@/lib/db";
import { devLog } from "@/lib/dev-log";

const bodySchema = z.object({
  name: z.string().min(1).max(100),
});

export async function PATCH(request: Request) {
  devLog("api:profile", "PATCH: start");
  const session = await auth();
  if (!session?.user?.id) {
    devLog("api:profile", "PATCH: 401");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const json = await request.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      devLog("api:profile", "PATCH: 400", { userId: session.user.id });
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const [user] = await db
      .update(users)
      .set({ name: parsed.data.name })
      .where(eq(users.id, session.user.id))
      .returning({
        id: users.id,
        email: users.email,
        name: users.name,
        profileImageUrl: users.profileImageUrl,
      });

    if (!user) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    devLog("api:profile", "PATCH: ok", { userId: user.id });
    return NextResponse.json(user);
  } catch {
    devLog("api:profile", "PATCH: 500");
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
