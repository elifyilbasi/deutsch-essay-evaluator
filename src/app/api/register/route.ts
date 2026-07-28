import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const body = await request.json();
  const { name, email, password } = body as {
    name?: string;
    email?: string;
    password?: string;
  };

  const trimmedName = typeof name === "string" ? name.trim() : "";

  if (!trimmedName) {
    return NextResponse.json({ error: "Name is required." }, { status: 400 });
  }

  if (typeof email !== "string" || typeof password !== "string" || password.length < 8) {
    return NextResponse.json(
      { error: "Email and a password of at least 8 characters are required." },
      { status: 400 },
    );
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json(
      { error: "An account with this email already exists." },
      { status: 409 },
    );
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.create({
    data: {
      name: trimmedName,
      email,
      passwordHash,
    },
  });

  return NextResponse.json({ ok: true });
}
