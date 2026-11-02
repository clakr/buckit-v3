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

function InsetCardTitle({
  className,
  children,
  action,
  subtitle,
  as: TitleElement = "span",
  ...props
}: React.ComponentProps<"div"> & {
  action?: React.ReactNode;
  subtitle?: React.ReactNode;
  as?: "span" | "h1";
}) {
  const title = (
    <TitleElement className="flex items-center gap-x-1.5 font-semibold">{children}</TitleElement>
  );

  return (
    <div
      data-slot="inset-card-title"
      className={cn("flex items-center justify-between gap-x-2 px-2 pt-2 pb-3", className)}
      {...props}
    >
      {subtitle ? (
        <div className="flex flex-col">
          {title}
          <span className="text-xs text-muted-foreground">{subtitle}</span>
        </div>
      ) : (
        title
      )}
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
