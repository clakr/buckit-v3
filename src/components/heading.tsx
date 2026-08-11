import type { ComponentProps } from "react";

import { cn } from "#/lib/utils";

export function Heading({ className, children, ...rest }: ComponentProps<"h1">) {
  return (
    <h1 className={cn("text-2xl font-semibold", className)} {...rest}>
      {children}
    </h1>
  );
}
