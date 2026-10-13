# Prototyping

How the `prototype` skill's UI branch should run in this repo.

## Use the existing switcher

`src/components/prototype-switcher.tsx` is the floating variant bar (one button per variant, click to jump). **Import it; don't recreate it.** It's router-agnostic (`onChange` callback), also cycles with ← / → (ignored while typing in an input), and renders nothing in production builds.

## Wiring on a route

Variants live on the existing page, gated by a `?variant=` search param. Make the param optional so existing links to the route keep type-checking:

```tsx
const VARIANTS = ["A", "B", "C"] as const;
type Variant = (typeof VARIANTS)[number];

export const Route = createFileRoute("/_protected/some-page")({
  validateSearch: (search: Record<string, unknown>): { variant?: Variant } => ({
    variant: VARIANTS.includes(search.variant as Variant) ? (search.variant as Variant) : undefined,
  }),
  // ...
});

// in the component
const { variant = "A" } = Route.useSearch();
const navigate = useNavigate({ from: Route.fullPath });

<PrototypeSwitcher
  variants={VARIANTS}
  current={variant}
  names={{ A: "Opening entry", B: "Heading popover", C: "Side card" }}
  onChange={(next) => navigate({ search: { variant: next }, replace: true })}
/>
```

## Cleaning up

Commit the full set of variants plus the wiring to a `prototype/<name>` branch, then fold only the winner into `master` and drop the `validateSearch` and `<PrototypeSwitcher>` usage. `prototype-switcher.tsx` itself stays.
