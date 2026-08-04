import Link from "next/link";
import { auth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function Home() {
  const session = await auth();
  const ctaHref = session?.user ? "/write" : "/login";

  return (
    <div className="space-y-10">
      <section className="space-y-4 text-center">
        <h1 className="text-4xl font-semibold tracking-tight">
          Write better German essays for TELC and Goethe
        </h1>
        <p className="mx-auto max-w-xl text-muted-foreground">
          Pick your exam institute and level, write your essay, and get instant AI feedback:
          grammar corrections, a criteria breakdown, and a score — modeled on how examiners
          actually grade.
        </p>
        <div className="flex justify-center gap-3">
          <Button
            size="lg"
            nativeButton={false}
            render={<Link href={ctaHref}>{session?.user ? "Write a new essay" : "Get started"}</Link>}
          />
          {!session?.user && (
            <Button
              size="lg"
              variant="outline"
              nativeButton={false}
              render={<Link href="/login">Log in</Link>}
            />
          )}
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Choose your exam</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            TELC A1–B1 supported today, with more levels and Goethe-Institut coming soon.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Write with guidance</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Real exam-style prompts and a live word counter keep you on target.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Get detailed feedback</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Inline grammar corrections, per-criterion scoring, and a summary — saved to your
            essay history.
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
