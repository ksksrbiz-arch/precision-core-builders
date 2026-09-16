# Reference: File Structure & Path Aliases

Loaded when: you need to find where something lives.

## 4. File Structure (Actual)

```
precision-core-builders/
├── client/
│   ├── src/
│   │   ├── _core/hooks/         # useAuth.ts (core auth hook)
│   │   ├── components/
│   │   │   ├── ui/              # 50+ shadcn/ui components (button, card, dialog, etc.)
│   │   │   ├── AIChatBox.tsx    # AI chat interface
│   │   │   ├── DashboardLayout.tsx
│   │   │   ├── ErrorBoundary.tsx
│   │   │   └── Map.tsx          # Google Maps integration
│   │   ├── contexts/            # ThemeContext.tsx
│   │   ├── hooks/               # useMobile, useComposition, usePersistFn
│   │   ├── lib/
│   │   │   ├── trpc.ts          # tRPC client setup
│   │   │   └── utils.ts         # cn() utility (clsx + tailwind-merge)
│   │   ├── pages/
│   │   │   ├── Home.tsx         # Landing page
│   │   │   ├── NotFound.tsx     # 404 page
│   │   │   └── ComponentShowcase.tsx
│   │   ├── App.tsx              # Router (Wouter)
│   │   ├── main.tsx             # React + tRPC + React Query setup
│   │   ├── const.ts             # getLoginUrl(), COOKIE_NAME
│   │   └── index.css            # Tailwind theme + custom styles
│   └── public/                  # Static assets
├── server/
│   ├── _core/
│   │   ├── index.ts             # Express entry point (LEGACY — migrate to Netlify Functions)
│   │   ├── trpc.ts              # Router, publicProcedure, protectedProcedure, adminProcedure
│   │   ├── context.ts           # TrpcContext, createContext
│   │   ├── oauth.ts             # OAuth callback (LEGACY — replace with Netlify Identity)
│   │   ├── sdk.ts               # Manus OAuth SDK (LEGACY — replace with Netlify Identity)
│   │   ├── cookies.ts           # Session cookie options (LEGACY)
│   │   ├── env.ts               # Environment variable aggregation
│   │   ├── vite.ts              # Vite dev server setup
│   │   ├── systemRouter.ts      # health, notifyOwner endpoints
│   │   ├── llm.ts               # LLM types (stubbed)
│   │   ├── voiceTranscription.ts # Voice-to-text interface (stubbed)
│   │   ├── notification.ts      # Notification delivery (stubbed)
│   │   └── map.ts               # Map utilities
│   ├── routers.ts               # appRouter definition
│   ├── db.ts                    # Drizzle ORM, user queries (adapt to Netlify DB extension)
│   ├── storage.ts               # AWS S3 helpers (LEGACY — replace with Netlify Blobs)
│   └── auth.logout.test.ts      # Test file
├── shared/
│   ├── _core/errors.ts          # HttpError, BadRequestError, UnauthorizedError, ForbiddenError
│   ├── const.ts                 # COOKIE_NAME, ONE_YEAR_MS, AXIOS_TIMEOUT_MS, error messages
│   └── types.ts                 # Shared TypeScript types
├── drizzle/
│   ├── schema.ts                # Database schema (users table)
│   ├── relations.ts             # Table relationships
│   └── 0000_rapid_donald_blake.sql  # Initial migration
├── netlify/
│   └── functions/               # Serverless functions (planned, not implemented)
├── patches/                     # pnpm patches (wouter@3.7.1)
├── .env.example                 # Environment variable template
├── drizzle.config.ts            # Drizzle Kit config (MySQL dialect)
├── vite.config.ts               # Vite config
├── vitest.config.ts             # Test config
├── tsconfig.json                # TypeScript config
├── netlify.toml                 # Netlify deployment config
├── components.json              # shadcn/ui config
├── .prettierrc                  # 80 chars, 2 spaces, trailing commas
└── package.json                 # Scripts, dependencies
```

### Path Aliases

- `@/*` → `client/src/*`
- `@shared/*` → `shared/*`

---
