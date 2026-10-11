<!-- bisiyata dishmaya, leharbot ahava biyisral -->

# Saprili docs (for humans and coding agents)

Spec and status of Saprili, split by topic. These replace the old `mission-brief.md` and `saprili-plan.md`.
Docs describe the system **as built**; anything not built or not verified is only in [TODO.md](./TODO.md).

| File | Contents |
|---|---|
| [TODO.md](./TODO.md) | **Everything not done**: verification, code gaps, release steps, backlog |
| [01-product-overview.md](./01-product-overview.md) | What Saprili is, non-goals, vocabulary, cross-cutting rules, build status |
| [02-data-and-storage.md](./02-data-and-storage.md) | Platform, permissions, storage, entities, constants, errors |
| [03-book-content-and-import.md](./03-book-content-and-import.md) | Book structure, binding, setup, settings, page operations, CSV import |
| [04-layout-and-print.md](./04-layout-and-print.md) | Layout engine, page geometry, theme, fonts, pre-flight, colophon, cover, PDF export |
| [05-screens.md](./05-screens.md) | Routes and screen behaviour |
| [06-ai-generation.md](./06-ai-generation.md) | Gemini provider, prompts, retry/history, background job queue |
| [07-backup-and-export.md](./07-backup-and-export.md) | Backup/restore ZIP, per-page download |
| [08-architecture-and-conventions.md](./08-architecture-and-conventions.md) | Code layout, dependencies, rules for agents, tests and commands |
| [09-decisions-and-open-questions.md](./09-decisions-and-open-questions.md) | Settled/assumed/open decisions, print-shop placeholders, owner inputs |

Setup, run and test commands are in the repo [README](../README.md).

## Keeping docs honest
- Update the topic file when behaviour changes; do not keep change logs here (git has them).
- When something is built but unverified, say so in the topic file **and** list the check in TODO.md.
- Do not add planning notes elsewhere; add a TODO item instead.
