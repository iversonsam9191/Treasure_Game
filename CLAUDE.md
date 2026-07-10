# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install       # install dependencies
npm run dev       # start client (Vite, :3000) + API server (tsx watch, :3001) concurrently
npm run build     # production build → ./build/
npm run start     # run the built app: single Express server serving API + static build
npm run lint      # eslint .
```

There is no test runner configured.

`npm run start` also requires `NODE_ENV=production` (not set by the script itself) for the static-build-serving branch in `server/index.ts` to activate, and `JWT_SECRET` set in the environment — the server throws at startup in production if it's missing (see Auth below).

In dev, Vite proxies `/api/*` requests to `http://localhost:3001` (see `vite.config.ts`). In production (`NODE_ENV=production`), `server/index.ts` itself serves the static `./build/` output, so only one process runs.

## Architecture

This is a React + TypeScript + Vite client with a small Express + SQLite backend for auth and score persistence.

### Client (`src/`)

- **`src/App.tsx`** — all game logic. Three `Box` objects are held in state (`id`, `isOpen`, `hasTreasure`). One box is randomly assigned the treasure at game start via `initializeGame()`. Clicking a closed box calls `openBox(id)`, which updates the score (+100 treasure, -50 skeleton) and checks end conditions: treasure found OR all boxes opened triggers `gameEnded = true`. The derived `result` (`WIN`/`TIE`/`LOSS`) is computed from score sign.
- **Auth flow**: `src/main.tsx` wraps `<App />` in `AuthProvider` (`src/contexts/AuthContext.tsx`), which loads the current session on mount via `GET /api/auth/me` and exposes `user`, `isGuest`, `signUp`/`signIn`/`signOut`, `continueAsGuest`/`exitGuestMode`, and `recordGameResult`. Consume it via the `useAuth()` hook (`src/hooks/useAuth.ts`), not `useContext` directly.
- **`src/components/auth/AuthGate.tsx`** — sign in/up form shown by `App.tsx` whenever there's no authenticated user and no guest session; also offers "Continue as Guest".
- **`src/lib/api.ts`** — thin fetch wrapper (`request<T>`) for all `/api/*` calls; all requests are sent with `credentials: 'include'` since auth is cookie-based.
- Once a game ends, `App.tsx` calls `recordGameResult(score, result)` exactly once per game (guarded by a ref) — but **only for signed-in users**; guest results are never persisted.

### Server (`server/`)

- **`server/index.ts`** — Express entrypoint. Mounts `/api/auth` and `/api/scores` routers, parses JSON + cookies. In production, also serves `./build/` as static files with an SPA fallback.
- **`server/db.ts`** — opens a SQLite database at `server/data/app.db` using Node's built-in `node:sqlite` (`DatabaseSync`), creating `users`, `revoked_tokens`, and `game_scores` tables if missing.
- **`server/auth.ts`** — password hashing (scrypt) and JWT helpers (`createUser`, `verifyPassword`, `issueToken`, `getUserByToken`, `revokeToken`). Auth is a signed JWT (`HS256`, `sub`=user id, `jti`=random token id, 30-day expiry) carried in an httpOnly cookie (`auth_token`, defined via `AUTH_COOKIE_NAME`) — not a bare stateless JWT: since pure JWTs can't be revoked before they expire, sign-out inserts the token's `jti` into the `revoked_tokens` table, and `getUserByToken` checks that denylist on every request in addition to verifying the signature. The signing secret comes from `JWT_SECRET`; if unset, the server throws at startup in production, or falls back to a fixed insecure dev secret (logged as a warning) so tokens survive `tsx watch` restarts locally.
- **`server/routes/auth.ts`** — `POST /signup`, `POST /signin`, `POST /signout`, `GET /me`.
- **`server/routes/scores.ts`** — requires an authenticated session (checked via router-level middleware reading the session cookie); `POST /` inserts a `game_scores` row. `GET /?page=&pageSize=` returns the signed-in user's score history, newest first, paginated (`pageSize` defaults to 10, capped at 50) with a `pagination` object (`page`/`pageSize`/`total`/`totalPages`) alongside `scores`.
- **`server/openapi.ts`** — hand-written OpenAPI 3.0 spec for all `/api/*` routes. Served as interactive Swagger UI at `/api/docs` and raw JSON at `/api/openapi.json` (mounted in `server/index.ts`). Keep this in sync when adding/changing routes — there's no generator wired up.

### Assets

| Path | Purpose |
|---|---|
| `src/assets/treasure_closed.png` | Closed chest (default state) |
| `src/assets/treasure_opened.png` | Opened chest with treasure |
| `src/assets/treasure_opened_skeleton.png` | Opened chest with skeleton |
| `src/assets/key.png` | Key icon used as the custom cursor when hovering a closed chest |
| `src/audios/chest_open.mp3` | Sound for opening a treasure chest |
| `src/audios/chest_open_with_evil_laugh.mp3` | Sound for opening a skeleton chest |

### UI stack

- **Tailwind CSS** — utility classes throughout
- **shadcn/ui** (`src/components/ui/`) — pre-built Radix UI components; import from `@/components/ui/<component>`
- **motion/react** (Framer Motion) — used for chest flip, scale, and reveal animations
- **react-hook-form** — used in `AuthGate` for the sign in/up form
- **sonner** — toast notifications (mounted via `<Toaster />` in `src/main.tsx`); used e.g. when score persistence fails
- **`@` alias** resolves to `./src` (configured in both `vite.config.ts` and `tsconfig.json`)

### Build output

Vite builds the client to `./build/` (not the default `dist/`). The SQLite database file lives under `server/data/`, created on first run — it is not committed.
