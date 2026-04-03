import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { users } from "@/drizzle/schema";
import { db } from "@/lib/db";
import { devLog } from "@/lib/dev-log";

const bodySchema = z.object({
  email: z.string().email().max(320),
  name: z.string().min(1).max(100),
  password: z.string().min(8).max(128),
});

export async function POST(request: Request) {
  devLog("api:register", "POST: start");
  try {
    const json = await request.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      devLog("api:register", "POST: 400 validation");
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { email, name, password } = parsed.data;
    const existing = await db.query.users.findFirst({
      where: eq(users.email, email),
    });
    if (existing) {
      devLog("api:register", "POST: 409 email exists", { email });
      return NextResponse.json(
        { error: "Email already registered" },
        { status: 409 },
      );
    }

    const passwordHash = await hash(password, 12);
    await db.insert(users).values({ email, name, passwordHash });

    devLog("api:register", "POST: 201 created", { email });
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch {
    devLog("api:register", "POST: 500");
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
