import type { PropsWithChildren } from "react";

type Props = PropsWithChildren<{
  heading: string;
}>;

export function Main({ heading, children }: Props) {
  return (
    <main className="flex flex-col gap-y-4 p-6">
      <h1 className="text-2xl font-semibold">{heading}</h1>
      {children}
    </main>
  );
}
