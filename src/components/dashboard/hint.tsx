import type { ReactNode } from "react";
import { Info } from "lucide-react";
import { cn } from "@/lib/cn";

export function Hint({
  label,
  children,
  align = "center",
}: {
  label: string;
  children: ReactNode;
  align?: "center" | "end";
}) {
  return (
    <span className="group relative inline-flex">
      <button
        type="button"
        aria-label={label}
        className="relative -m-2 inline-flex size-11 items-center justify-center rounded-full text-muted transition-colors duration-200 ease-out hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pine"
      >
        <Info className="size-4" aria-hidden="true" />
      </button>
      <span
        role="tooltip"
        className={cn(
          "pointer-events-none absolute top-full z-30 mt-1 hidden w-60 rounded-lg bg-ink px-3 py-2 text-left text-xs leading-relaxed font-normal tracking-normal text-paper normal-case shadow-card group-hover:block group-focus-within:block",
          align === "end" ? "right-0" : "left-1/2 -translate-x-1/2",
        )}
      >
        {children}
      </span>
    </span>
  );
}
