# Contributing to Precision Core Builders

This document provides guidelines for developing and contributing to the Precision Core Builders platform.

## Getting Started

### Prerequisites

- Node.js 20 or later
- pnpm 10.4.1 or later
- Supabase account (for database and authentication)
- Git

### Initial Setup

1. Clone the repository:

   ```bash
   git clone https://github.com/ksksrbiz-arch/precision-core-builders.git
   cd precision-core-builders
   ```

2. Install dependencies:

   ```bash
   pnpm install
   ```

3. Set up environment variables:

   ```bash
   cp .env.example .env.local
   # Edit .env.local with your actual credentials
   ```

4. Run database migrations:

   ```bash
   pnpm db:push
   ```

5. Start the development server:
   ```bash
   pnpm dev
   ```

The application will be available at `http://localhost:3000`.

## Development Workflow

### Code Style

- This project uses Prettier for code formatting
- TypeScript strict mode is enabled
- Follow the existing code style and patterns

### Branch Strategy

- `main`: Production-ready code
- Feature branches: `feature/your-feature-name`
- Bug fixes: `fix/bug-description`
- Claude/AI branches: `claude/task-description`

### Making Changes

1. Create a new branch from `main`:

   ```bash
   git checkout -b feature/your-feature-name
   ```

2. Make your changes following the guidelines in `CLAUDE.md`

3. Run type checking:

   ```bash
   pnpm check
   ```

4. Run tests:

   ```bash
   pnpm test
   ```

5. Format code:

   ```bash
   pnpm format
   ```

6. Build the project:

   ```bash
   pnpm build
   ```

7. Commit your changes with a descriptive message:

   ```bash
   git add .
   git commit -m "feat: add your feature description"
   ```

8. Push to GitHub:

   ```bash
   git push origin feature/your-feature-name
   ```

9. Create a Pull Request on GitHub

### Commit Message Convention

Use conventional commits format:

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `style:` Code style changes (formatting, etc.)
- `refactor:` Code refactoring
- `test:` Adding or updating tests
- `chore:` Maintenance tasks

### Testing

- Write Vitest tests for all new features
- Ensure all tests pass before committing
- Place tests next to the code they test with `.test.ts` extension

### Database Changes

1. Update schema in `drizzle/schema.ts`
2. Generate migrations:
   ```bash
   pnpm db:push
   ```
3. Review the generated SQL in the Supabase dashboard
4. Document any manual steps required

## Architecture Guidelines

### Frontend (React)

- Components go in `client/src/components/`
- Pages go in `client/src/pages/`
- Use TypeScript for all components
- Use Tailwind CSS for styling (follow the "Quiet Luxury" design system in `CLAUDE.md`)
- Use Framer Motion for animations

### Backend (tRPC)

- Add procedures to `server/routers.ts`
- Use `publicProcedure` for unauthenticated endpoints
- Use `protectedProcedure` for authenticated endpoints
- Database queries go in `server/db.ts`

### Netlify Functions (Serverless)

- Create new functions in `netlify/functions/`
- Name files with `.ts` extension
- Export a handler function
- Use environment variables for secrets

### Database (Supabase)

- Schema defined in `drizzle/schema.ts`
- Use Drizzle ORM for queries
- Implement Row-Level Security (RLS) policies in Supabase dashboard

## File Organization

```
precision-core-builders/
├── client/                    # React frontend
│   ├── src/
│   │   ├── pages/            # Page components
│   │   ├── components/       # Reusable UI components
│   │   ├── lib/              # Utilities (tRPC, Supabase)
│   │   ├── contexts/         # React contexts
│   │   ├── hooks/            # Custom hooks
│   │   └── index.css         # Design system
│   └── public/               # Static assets
├── server/                   # Backend
│   ├── _core/               # Framework internals (DO NOT modify)
│   ├── routers.ts           # tRPC procedures
│   ├── db.ts                # Database helpers
│   └── *.test.ts            # Tests
├── netlify/                 # Netlify Functions (create as needed)
│   └── functions/           # Serverless functions
├── drizzle/                 # Database
│   ├── schema.ts            # Schema definition
│   └── relations.ts         # Table relations
├── shared/                  # Shared code (client + server)
├── CLAUDE.md                # Agent priming & architecture
├── README.md                # Project overview
├── CONTRIBUTING.md          # This file
└── package.json
```

## Design System: "Quiet Luxury"

Follow the design guidelines in `CLAUDE.md`:

- **Colors**: Warm beige (#F5F1ED), warm steel (#8B7355), stone gray (#A9A9A9)
- **Typography**: Playfair Display (headings), Inter (body)
- **Animations**: 300ms smooth transitions, subtle hover effects
- **Imagery**: High-quality, cinematic, full-bleed where appropriate

## Security Best Practices

1. Never commit secrets or API keys
2. Always use environment variables for configuration
3. Implement proper input validation using Zod
4. Use Supabase Row-Level Security (RLS) for data access control
5. Test authentication and authorization thoroughly
6. Sanitize user inputs to prevent XSS and injection attacks

## Working with Claude Code/Chat

This repository is optimized for development with Claude Code and Claude Chat:

1. **CLAUDE.md**: Contains architectural vision, constraints, and implementation strategy
2. **Type Safety**: End-to-end type safety with tRPC ensures AI-generated code is correct
3. **Testing**: Write tests for critical functionality to validate AI-generated code
4. **Documentation**: Inline comments help Claude understand complex logic

### Tips for Claude-Assisted Development

- Reference `CLAUDE.md` for architectural decisions
- Ask Claude to run tests after making changes
- Request TypeScript checks with `pnpm check`
- Have Claude format code with `pnpm format`
- Ask Claude to verify the build with `pnpm build`

## Troubleshooting

### Build Fails

1. Clear build cache:

   ```bash
   rm -rf dist/ node_modules/.cache/
   ```

2. Reinstall dependencies:

   ```bash
   pnpm install --force
   ```

3. Check TypeScript errors:
   ```bash
   pnpm check
   ```

### Tests Fail

1. Ensure database is running and migrations are applied
2. Check environment variables in `.env.local`
3. Run tests in watch mode for debugging:
   ```bash
   pnpm test --watch
   ```

### Development Server Issues

1. Check port 3000 is not already in use
2. Verify environment variables are set correctly
3. Clear browser cache and hard reload

## Getting Help

- Review `CLAUDE.md` for architectural guidance
- Check `README.md` for project overview
- Review existing code for patterns and examples
- Contact Eric Tadlock for Precision Core Builders specific questions

## License

MIT License - See LICENSE file for details
