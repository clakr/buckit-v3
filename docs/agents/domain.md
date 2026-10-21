# Domain docs

How the engineering skills should read this repo's domain docs when exploring the codebase.

## Before exploring, read these

- **`CONTEXT.md`** at the repo root, or
- **`CONTEXT-MAP.md`** at the repo root, if it exists. It points at one `CONTEXT.md` per context. Read each one relevant to the topic.
- **`docs/adr/`**. Read the ADRs that touch the area you're about to work in. In multi-context repos, also check `src/<context>/docs/adr/` for context-scoped decisions.

If any of these files don't exist, **proceed silently**. Don't mention that they're missing, and don't suggest creating them up front. The `/domain-modeling` skill, which `/grill-with-docs` and `/improve-codebase-architecture` call, creates them once a term or decision gets resolved.

## File structure

Single-context repo (most repos):

```
/
├── CONTEXT.md
├── docs/adr/
│   ├── 0001-event-sourced-orders.md
│   └── 0002-postgres-for-write-model.md
└── src/
```

Multi-context repo, marked by a `CONTEXT-MAP.md` at the root:

```
/
├── CONTEXT-MAP.md
├── docs/adr/                          ← system-wide decisions
└── src/
    ├── ordering/
    │   ├── CONTEXT.md
    │   └── docs/adr/                  ← context-specific decisions
    └── billing/
        ├── CONTEXT.md
        └── docs/adr/
```

## Use the glossary's vocabulary

When your output names a domain concept, such as in an issue title, a refactor proposal, a hypothesis or a test name, use the term as `CONTEXT.md` defines it. Don't switch to synonyms the glossary lists under _Avoid_.

If the concept you need isn't in the glossary yet, either you're inventing language the project doesn't use, so reconsider, or the glossary has a real gap, so note it for `/domain-modeling`.

## Flag ADR conflicts

If your output contradicts an existing ADR, say so instead of quietly overriding it:

> _Contradicts ADR-0007 (event-sourced orders), but worth reopening because…_
