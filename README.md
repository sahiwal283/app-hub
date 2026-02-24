# app-hub

Monorepo for the internal App Hub platform.

## Repository Layout

- `core-platform/platform-frontend`: Next.js frontend
- `core-platform/platform-backend`: Express + TypeScript backend
- `core-platform/infra`: infrastructure and provisioning scripts
- `core-platform/docker-compose*.yml`: local/staging deployment stacks

## Agent Workflow

This repository is operated by three agent tracks:

- **Frontend Agent**: UI, UX, client-side behavior
- **Backend Agent**: API, authorization, data contracts
- **DevOps/Deployment Agent**: build, deploy, release verification

Each agent works on its own branch and opens a pull request to `main`.

## Branching Model

- `main`: protected, PR-only merge target
- `feature/frontend-*`: frontend feature work
- `feature/backend-*`: backend feature work
- `chore/devops-*`: deployment, infra, and CI changes

## Pull Request Policy

- No direct pushes to `main`
- At least one reviewer approval before merge
- Required status checks must pass
- Squash merge preferred for clean history

## Quick Start

Use project-level docs for runtime commands:

- `core-platform/README.md`
- `core-platform/platform-frontend/README.md` (frontend agent owned)
- `core-platform/platform-backend/README.md` (backend agent owned)
