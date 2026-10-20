import { useEffect } from "react";

type Props<VariantKey extends string> = {
  variants: readonly VariantKey[];
  current: VariantKey;
  names?: Partial<Record<VariantKey, string>>;
  onChange: (variant: VariantKey) => void;
};

export function PrototypeSwitcher<VariantKey extends string>({
  variants,
  current,
  names,
  onChange,
}: Props<VariantKey>) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (
        event.target instanceof Element &&
        event.target.closest("input, textarea, [contenteditable]")
      )
        return;

      const step = event.key === "ArrowLeft" ? -1 : event.key === "ArrowRight" ? 1 : 0;
      if (!step) return;

      const nextIndex = (variants.indexOf(current) + step + variants.length) % variants.length;

      onChange(variants[nextIndex]);
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  if (import.meta.env.PROD) return null;

  const name = names?.[current];

  return (
    <div className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 flex-col items-center gap-y-1">
      {name ? (
        <span className="rounded bg-foreground px-2 py-0.5 text-xs text-background">{name}</span>
      ) : null}
      <div className="flex gap-x-1 rounded-lg bg-foreground p-1 shadow-lg">
        {variants.map((variant) => (
          <button
            key={variant}
            type="button"
            onClick={() => onChange(variant)}
            aria-pressed={variant === current}
            className={`size-8 rounded-md text-sm font-medium ${
              variant === current ? "bg-background text-foreground" : "text-background/70"
            }`}
          >
            {variant}
          </button>
        ))}
      </div>
    </div>
  );
}
