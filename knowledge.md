# knowledge.md — QR Menu for Cafe

## What this is
Client-side QR-menu web app for one café: guests scan a table QR code, browse a trilingual menu (uk/en/hu), and send orders to the kitchen; the owner manages dishes/categories/tables/QR codes and tracks orders in an owner cabinet. Next.js 16.3 App Router + React 19.2 + Tailwind CSS 4, all client components (pure SPA). Data lives in **Supabase** (Postgres + Auth + Storage + Realtime); `localStorage` is used only for the UI language preference (`qr_menu_lang`).

## Where key code lives
- Routes (all `'use client'` pages, each wrapped in `QRMenuProvider`): `app/page.tsx` — guest menu; `app/admin/page.tsx` — owner cabinet (`/admin`, login form when signed out); `app/admin/profile/page.tsx` — account/password (`/admin/profile`).
- `lib/store.tsx` — single source of truth: types (`MenuItem`, `Category`, `Order`, `OrderItem`), `QRMenuProvider` context, `TRANSLATIONS` i18n map, Supabase data access (fetch menu, CRUD, `createOrder`), Realtime subscription for orders, owner auth (`isOwner`/`signIn`/`signOut`).
- `lib/supabase/client.ts` — Supabase client from env keys.
- `components/CustomerMenu.tsx` — guest view: categories, cart (quantity stepper `[−][n][+]` + round add button, per-item delete, two-row product row), order placement via `?table=<id>`.
- `components/OwnerCabinet.tsx` — owner view: dish/category/table CRUD, order status flow, per-table QR (generated via `qrcode` pkg, PNG uploaded to `qr-codes` bucket, path in `tables.qr_path`, displayed via `getPublicUrl`).
- `components/LanguageSwitcher.tsx` — ua/en/hu toggle.
- `hooks/use-mobile.ts` — `useIsMobile()` (768px breakpoint).
- `lib/utils.ts` — `cn()` (clsx + tailwind-merge).
- `supabase/migrations/` — schema + RLS (applied to remote project via MCP `apply_migration`); `supabase/seed.sql` — seed data (5 categories, 7 dishes, 5 tables).

## Commands
- `npm install` — install deps
- `npm run dev` — dev server (http://localhost:3000)
- `npm run build` — production build (Turbopack); `prebuild` runs ESLint; TS errors fail the build
- `npm run start` — serve production build
- `npm run lint` — ESLint flat config (`eslint.config.mjs`; `eslint .`)
- `npm test` — Vitest single run; `npm run test:watch` — watch mode; `npm run test:e2e` — Playwright e2e (fake-Supabase mock + dev server + Chromium)
- `npm run clean` — `next clean`

## Tests
Vitest + React Testing Library (jsdom), config `vitest.config.mts`. **36 tests** across 4 files — store 23, AdminProfile 3, CustomerMenu 4, OwnerCabinet 6 — all using the shared in-memory Supabase fake at `lib/__fixtures__/supabase-fake.ts`. **3 Playwright e2e tests** (`e2e/guest-flow.spec.ts`) run the guest flow against a fake-Supabase HTTP mock (`e2e/supabase-mock.mjs`, PostgREST-style + CORS + `__state` inspection; config `playwright.config.ts` spins up mock :54321 + app :3100).

## Conventions & gotchas
- **Pure SPA**: every page/component is `'use client'`. Do not introduce server components, route handlers, or API routes.
- **i18n**: every user-visible string goes through `t('key')` from `useQRMenu()`. Add keys to `TRANSLATIONS` in `lib/store.tsx` with `ua` and `en` (plus `hu` where sensible). Never hardcode UI text.
- **Data model**: trilingual fields (`nameUa/nameEn/nameHu`, `descriptionUa/…`, `ingredientsUa/…`); row ids are UUIDs generated client-side (`crypto.randomUUID()`, fallback `id-${Date.now()}-…` in jsdom).
- **Persistence**: Supabase only for menu/orders/tables. RLS: `anon` = guests (read menu, insert orders only — least privilege, TRUNCATE revoked); `authenticated` = the single café owner (full control). Realtime published for `orders`. Don't reintroduce localStorage for data.
- **Owner auth**: Supabase email+password, no hardcoded passwords; owner cabinet gated by `isOwner`. Owner account: `etvesh.p@gmail.com` (temp password — must be changed).
- **Storage**: buckets `dish-images` and `qr-codes` are public (CDN by URL) but have **no** public SELECT/listing policies; writes owner-only. Dish/category images stay remote URLs (Unsplash presets) — no local image upload for presets; actual uploads go to Storage. Table QR path lives in `tables.qr_path`; deleting a table also removes its file.
- **Settings**: owner prefs (sound toggle) persist in the `settings` table under key `owner`.
- **UI**: Tailwind utilities inline; stone/amber palette; `motion` + `AnimatePresence` for transitions.
- **Git workflow**: commit with a descriptive message after each change; do **not** push after every commit. Release = merge `main` → `production` branch + deploy hook `?buildCache=false`. Production live at `qrmenu-omega-azure.vercel.app`. Use `VERCEL_FORCE_NO_BUILD_CACHE=1` to avoid stale Turbopack cache builds.
- **Env**: `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` (publishable keys) in `.env.example` / `.env.local`. Supabase project **QRMenu** (ref `qgdevkykhnjzdjpitnps`, eu-central-1).

## Roadmap
`PLAN.md` holds the production roadmap, fixed decisions, and status (Phases 0–3 done, Phase 4 deploy done — live at `qrmenu-omega-azure.vercel.app`; post-release items: analytics, web push, PWA, online payment). `README.md` is the Ukrainian overview (up to date), `AGENTS.md` is the authoritative project description.
