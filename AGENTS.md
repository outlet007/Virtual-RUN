# Project Agent Rules

## Required Docker completion workflow

After any code or configuration change, the task is not complete until all of
the following checks pass:

1. Build and start the production container in the background:
   `docker compose up -d --build`
2. Confirm the `Virtual-RUN` container is running with `docker compose ps`.
3. Confirm `http://localhost:3000` returns a successful HTTP response.
4. Inspect `docker compose logs --tail 100` if startup or HTTP verification
   fails, then fix the problem and repeat the checks.

Do not require `npm run dev` for the user to view the system. The standard
viewing environment is the production Docker container on port 3000.

When a development container is occupying port 3000, stop it before starting
the production container.

## Existing project safeguards

- Read the Obsidian Virtual RUN Current Stage and relevant AI Skill rules
  before editing.
- Preserve unrelated user changes.
- Keep Supabase service-role credentials server-only.
- Verify RLS, Storage policies, and migrations whenever Supabase behavior is
  changed.
