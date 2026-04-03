import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { z } from "zod";
import { devLog } from "@/lib/dev-log";
import { prisma } from "@/lib/prisma";

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
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      devLog("api:register", "POST: 409 email exists", { email });
      return NextResponse.json(
        { error: "Email already registered" },
        { status: 409 },
      );
    }

    const passwordHash = await hash(password, 12);
    await prisma.user.create({
      data: { email, name, passwordHash },
    });

    devLog("api:register", "POST: 201 created", { email });
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch {
    devLog("api:register", "POST: 500");
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
