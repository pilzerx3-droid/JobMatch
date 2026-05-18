# SwipeJobs

A Tinder/TikTok-style job discovery mobile app — swipe right to save, left to skip.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000 → proxy 8080)
- `pnpm --filter @workspace/mobile run dev` — run the Expo mobile app
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL`, `CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `SESSION_SECRET`

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- **Mobile**: Expo SDK 54, React Native, Expo Router
- **API**: Express 5
- **DB**: PostgreSQL + Drizzle ORM
- **Auth**: Clerk (email/password + Google OAuth via `@clerk/expo` v3)
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec → `lib/api-client-react`)
- **Build**: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — source of truth for all API contracts
- `lib/api-client-react/src/` — generated React Query hooks + custom fetch
- `lib/db/src/schema/` — Drizzle ORM schema (users, companies, jobs, swipeActions)
- `artifacts/api-server/src/routes/` — Express route handlers
- `artifacts/api-server/src/middlewares/` — Clerk proxy + requireAuth middleware
- `artifacts/mobile/app/` — Expo Router screens
  - `(auth)/` — welcome, sign-in, sign-up screens
  - `(home)/(tabs)/` — discover (swipe feed), saved jobs, profile
  - `(home)/job/[id].tsx` — job detail modal
  - `(home)/admin.tsx` — admin dashboard
  - `onboarding.tsx` — 4-step onboarding wizard

## Architecture decisions

- Mobile auth uses bearer tokens via `setAuthTokenGetter` (no cookie jar in Expo)
- `AuthSetup` component in root `_layout.tsx` sets the token getter synchronously so queries have auth on first render
- Jobs route auto-seeds with 10 companies × 10 jobs if DB is empty on first request
- Swipe feed uses PanResponder with `useRef` callbacks to avoid stale closure issues
- Admin access is gated via `isAdmin` flag on `userProfile` table (set manually or via admin import)

## Product

- **Discover tab**: Swipeable card stack of job listings. Swipe right to save, left to skip. Cards show company logo, title, salary, remote type, match score, and tags.
- **Saved tab**: Bookmarked jobs list with unsave action.
- **Profile tab**: User preferences, job categories, stats, edit name, update preferences, sign out.
- **Job detail**: Full description, apply link, save/unsave button.
- **Onboarding wizard**: 4 steps — experience level, remote preference, job categories, location/salary.
- **Admin dashboard**: Platform analytics + seed jobs importer.

## User preferences

- Clerk Core v3 API for Expo: `useSignIn()` returns `{ signIn, errors, fetchStatus }` — NOT `{ signIn, setActive, isLoaded }` like v2
- OAuth uses `useSSO()` with `startSSOFlow()` — NOT `useOAuth()` with `startOAuthFlow()`
- Generated TanStack Query hooks require `queryKey` in query options (use the `getGet*QueryKey()` generators)

## Gotchas

- **Clerk v3 breaking changes**: `useSignIn()` no longer has `setActive` or `isLoaded`. Use `signIn.finalize()` to set the active session.
- **DB push**: Always run `pnpm --filter @workspace/db run push` after schema changes.
- **Codegen**: After editing `openapi.yaml`, run `pnpm --filter @workspace/api-spec run codegen`.
- **Auth token timing**: `setAuthTokenGetter` is called in render body of `AuthSetup` (not useEffect) to avoid race conditions with React Query.

## Pointers

- See `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
- See `clerk-auth` skill for Clerk setup, Expo patterns, and v3 API reference
