import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getUsageToday } from "@/lib/rateLimit";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const quota = await getUsageToday(session.user.id);
  return NextResponse.json(quota);
}
