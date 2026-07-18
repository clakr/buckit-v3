---
name: feature-spec
description: "Spec out a module feature when the user asks to write, create, or draft a spec for a module feature. Use when the user names a specific feature they want spec'd — create, view, edit, delete, list, detail."
---

# Feature Spec

The spec is a **decree** — it dictates what the code must build. Never reference the codebase. Only the project's `SPEC.md` and the module's `SPEC.md` are the **oracle**.

## Steps

### 1. Open the oracles

Read the user's request for the module name. Read only:

- `SPEC.md` (project root)
- `src/modules/<module>/SPEC.md` (module spec)

**Completion criterion:** Both files read. No code files read.

### 2. Classify the feature

| Class    | HTTP              | Description                                       |
| -------- | ----------------- | ------------------------------------------------- |
| Query    | GET               | Read-only. Returns data. No state change.         |
| Mutation | POST, PUT, DELETE | Creates, updates, or deletes data. Changes state. |

**Completion criterion:** Feature classified as Query or Mutation.

### 3. Write the decree

Read `MUTATION.md` or `QUERY.md` — use the one matching your classification. Write the spec to `src/modules/<module>/specs/<NN>-<feature-name>.md` where `NN` is the next available sequence number.

**Completion criterion:** Spec file written with all required sections from the template.
