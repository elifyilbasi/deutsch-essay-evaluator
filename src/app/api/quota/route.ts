import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getRemainingEvaluationsToday } from "@/lib/rateLimit";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const quota = await getRemainingEvaluationsToday(session.user.id);
  return NextResponse.json(quota);
}
