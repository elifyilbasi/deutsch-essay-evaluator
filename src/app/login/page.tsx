"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

function LoginForm() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";
  const [isRedirecting, setIsRedirecting] = useState(false);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sign in</CardTitle>
        <CardDescription>
          New here? Signing in with Google creates your account — there is no separate
          sign-up.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* No redirect:false, as the credentials form used to use: the point of OAuth is
            to leave for Google's consent screen and come back to callbackUrl. There is
            no error branch to render here for the same reason — a refusal comes back as
            ?error= on this page, handled by Auth.js, not as a resolved promise. */}
        <Button
          className="w-full"
          disabled={isRedirecting}
          onClick={() => {
            setIsRedirecting(true);
            signIn("google", { callbackUrl });
          }}
        >
          {isRedirecting ? "Taking you to Google…" : "Continue with Google"}
        </Button>
      </CardContent>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <div className="mx-auto max-w-sm">
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
