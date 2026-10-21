# Prototyping

How the `prototype` skill's UI branch should run in this repo.

## Use the existing switcher

`src/components/prototype-switcher.tsx` is the floating variant bar, with one button per variant. **Import it, and don't recreate it.** It doesn't depend on the router, because it reports changes through an `onChange` callback. The left and right arrow keys also cycle variants, except while focus is in an input. It renders nothing in production builds.

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
/>;
```

## Cleaning up

Commit the full set of variants plus the wiring to a `prototype/<name>` branch, then fold only the winner into `master` and drop the `validateSearch` and `<PrototypeSwitcher>` usage. `prototype-switcher.tsx` itself stays.
