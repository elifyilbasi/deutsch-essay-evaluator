"use client";

import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      aria-label="Toggle light or dark theme"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
    >
      {/*
       * Both icons are always rendered and CSS picks one from the `.dark` class.
       * Deciding in JS would need a post-hydration mount flag, which costs an
       * extra render and flashes the wrong icon on first paint.
       */}
      <Moon className="block dark:hidden" />
      <Sun className="hidden dark:block" />
    </Button>
  );
}
