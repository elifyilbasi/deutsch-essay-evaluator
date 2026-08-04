"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

export function NavBar() {
  const { data: session, status } = useSession();
  const pathname = usePathname();

  return (
    <header className="border-b">
      <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
        <Link href="/" className="font-semibold">
          Deutsch Essay Evaluator
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          {status === "authenticated" ? (
            <>
              <Link
                href="/dashboard"
                className={pathname === "/dashboard" ? "font-medium" : "text-muted-foreground"}
              >
                Dashboard
              </Link>
              <Link
                href="/write"
                className={pathname.startsWith("/write") ? "font-medium" : "text-muted-foreground"}
              >
                Write
              </Link>
              <span className="text-muted-foreground">
                {session.user?.name || session.user?.email}
              </span>
              <ThemeToggle />
              <Button variant="outline" size="sm" onClick={() => signOut({ callbackUrl: "/" })}>
                Sign out
              </Button>
            </>
          ) : status === "loading" ? null : (
            <>
              <ThemeToggle />
              {/* One button, not two: with Google there is no separate sign-up step —
                  the first sign-in creates the account. "Sign in" rather than "Log in"
                  for exactly that reason: "Log in" tells a first-time visitor they need
                  an account they do not have yet. */}
              <Button
                size="sm"
                nativeButton={false}
                render={<Link href="/login">Sign in</Link>}
              />
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
