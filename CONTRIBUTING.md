# Contributing

## Branch and PR Rules

1. Create a branch from `main` using one of:
   - `feature/frontend-<topic>`
   - `feature/backend-<topic>`
   - `chore/devops-<topic>`
2. Keep changes scoped to the feature request.
3. Open a PR to `main` (do not push directly to `main`).
4. Include:
   - change summary
   - test/deploy verification steps
   - screenshots for UI changes
5. Merge only after required checks pass and review is complete.

## Commit Guidance

- Use clear, concise commit messages.
- Prefer small commits grouped by purpose.
- Never commit secrets (`.env`, tokens, private keys).

## Environment and Security

- Use `.env.example` files as templates.
- Keep production/staging credentials out of git.
- Follow backend authorization and frontend security rules.
