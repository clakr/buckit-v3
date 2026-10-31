import * as React from "react";

import { Card, CardContent } from "#/components/ui/card";
import { cn } from "#/lib/utils";

function InsetCard({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="inset-card"
      className={cn(
        "flex flex-col rounded-lg bg-muted/50 p-1 ring-1 ring-foreground/10",
        className,
      )}
      {...props}
    />
  );
}

// Sits in the inset's gap above the content. To put a title inside the content instead, use
// `CardTitle` from `#/components/ui/card` as the first child of `InsetCardContent`.
function InsetCardTitle({
  className,
  children,
  action,
  ...props
}: React.ComponentProps<"div"> & { action?: React.ReactNode }) {
  return (
    <div
      data-slot="inset-card-title"
      className={cn("flex items-center justify-between gap-x-2 px-2 pt-2 pb-3", className)}
      {...props}
    >
      <span className="flex items-center gap-x-1.5 font-semibold">{children}</span>
      {action}
    </div>
  );
}

function InsetCardContent({
  className,
  cardClassName,
  ...props
}: React.ComponentProps<"div"> & { cardClassName?: string }) {
  return (
    <Card data-slot="inset-card-content" className={cn("min-h-0 flex-1", cardClassName)}>
      <CardContent className={cn("flex min-h-0 flex-1 flex-col gap-y-4", className)} {...props} />
    </Card>
  );
}

// Its children share the row evenly, such as a secondary action beside "View All".
function InsetCardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="inset-card-footer"
      className={cn("flex gap-x-2 px-2 pt-3 pb-2 *:flex-1", className)}
      {...props}
    />
  );
}

export { InsetCard, InsetCardTitle, InsetCardContent, InsetCardFooter };
