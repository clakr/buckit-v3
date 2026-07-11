import type { PropsWithChildren } from "react";

export function Main({ children }: PropsWithChildren) {
  return <main className="flex flex-col gap-y-3 p-6">{children}</main>;
}
