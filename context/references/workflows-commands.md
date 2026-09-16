# Reference: Development Commands & Testing

Loaded when: running builds, tests, migrations, or adding a component.

## 5. Development Workflows

### 5.1. Common Commands

```bash
pnpm dev              # Start dev server (tsx watch, Vite HMR)
pnpm build            # Production build (vite build + esbuild server)
pnpm start            # Run production server

pnpm check            # TypeScript type checking (tsc --noEmit)
pnpm format           # Format code with Prettier
pnpm format:check     # Check formatting
pnpm lint             # Type check + format check

pnpm test             # Run tests (vitest run)
pnpm test:watch       # Watch mode tests
pnpm test:coverage    # Tests with coverage report

pnpm db:generate      # Generate Drizzle migration
pnpm db:migrate       # Run Drizzle migration
pnpm db:push          # Generate + migrate in one step
pnpm db:studio        # Open Drizzle Studio GUI

pnpm check:estimating # Estimating-basis integrity + staleness
pnpm eval:ai          # AI routing / surface isolation / refusal rules (offline)
pnpm eval:ai:live     # Same refusal rules against a real model (needs a key)
pnpm validate         # Full validation: lint + estimating + eval:ai + test + build
pnpm clean            # Remove dist/, cache, logs
```

### 5.2. Adding a New Feature (End-to-End)

1. **Schema:** Add table(s) to `drizzle/schema.ts`, run `pnpm db:push`
2. **Server:** Add query helpers to `server/db.ts`
3. **Router:** Add tRPC router in a new file, register in `server/routers.ts`
4. **Client page:** Create page in `client/src/pages/`, add route in `App.tsx`
5. **Components:** Use existing shadcn/ui components from `client/src/components/ui/`
6. **Tests:** Add `*.test.ts` files in `server/` (Vitest, node environment)

### 5.3. Adding a shadcn/ui Component

The project uses shadcn/ui with the `components.json` config. 50+ components are already installed in `client/src/components/ui/`. Check there before adding new ones.

### 5.4. Database Migrations

Drizzle Kit manages schema changes:

```bash
# 1. Edit drizzle/schema.ts
# 2. Generate SQL migration
pnpm db:generate
# 3. Apply migration
pnpm db:migrate
```

### 5.5. Testing

- Test files: `server/**/*.test.ts` or `server/**/*.spec.ts`
- Environment: Node (not jsdom)
- Framework: Vitest
- Config: `vitest.config.ts`

---
