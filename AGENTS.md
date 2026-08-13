# QR Menu for Cafe — AGENTS.md

Client-side QR-menu web app for cafés: guest menu view, owner cabinet (dish/category CRUD, orders, table QR codes), trilingual (uk/en/hu). Next.js 16.3 App Router + React 19.2 + Tailwind CSS 4. Data lives in **Supabase** (Postgres + Realtime + Auth + Storage); `localStorage` is used only for the UI language preference.

## Project
- Stack: Next.js 16.3 (`app/` router, all client components, Turbopack bundler), React 19.2, Tailwind CSS 4 (`@tailwindcss/postcss`), `motion` (framer-motion), `lucide-react`, `qrcode`, TypeScript 5.
- Routes (each a `'use client'` page wrapped in `QRMenuProvider`, sharing `AppHeader`/`AppFooter`):
  - `/` (`app/page.tsx`) — guest menu (`CustomerMenu`).
  - `/admin` (`app/admin/page.tsx`) — owner cabinet (`OwnerCabinet`; login form when signed out).
  - `/admin/profile` (`app/admin/profile/page.tsx`) — owner account + change password (`AdminProfile`).
- Package manager: `npm` (package-lock.json).
- Tests: Vitest + React Testing Library (jsdom), config `vitest.config.mts`. 35 tests across 4 files: store (`lib/store.test.tsx`, 23) + components (`components/AdminProfile.test.tsx`, 3; `CustomerMenu.test.tsx`, 3; `OwnerCabinet.test.tsx`, 6) with a shared in-memory Supabase fake (`lib/__fixtures__/supabase-fake.ts`). Plus Playwright e2e (`e2e/guest-flow.spec.ts`, 3 tests, `npm run test:e2e`) running the guest flow against a fake-Supabase HTTP mock (`e2e/supabase-mock.mjs`) — the dev server is pointed at `http://localhost:54321`, never at the real backend.
- Backend: Supabase project **QRMenu** (ref `qgdevkykhnjzdjpitnps`, eu-central-1). Schema/RLS in `supabase/migrations/` (applied via MCP `apply_migration`). Publishable keys in `.env.example` / `.env.local`.
- Git repo initialized; latest commit on `main`.

## Commands
- `npm install` — install deps
- `npm run dev` — dev server
- `npm run build` — production build (Turbopack; `prebuild` runs ESLint; TS errors fail the build)
- `npm run start` — serve production build
- `npm run lint` — ESLint flat config (`eslint.config.mjs`; `eslint .`)
- `npm test` — Vitest (single run); `npm run test:watch` — watch mode; `npm run test:e2e` — Playwright e2e (starts a fake-Supabase mock + dev server, runs Chromium)

## Architecture
- `lib/store.tsx` — single source of truth. Types (`MenuItem`, `Category`, `Order`, `OrderItem`, `TableInfo`), `QRMenuProvider` context, translations (`TRANSLATIONS` map), Supabase data access (fetch menu, CRUD mutations, `createOrder` with client-generated uuid), Realtime subscription for orders, owner auth state (`isOwner`/`ownerEmail`/`signIn`/`signOut`/`changePassword`), owner prefs (`soundEnabled` persisted in `settings`), table QR generation + storage. Seed data in `supabase/seed.sql`.
- `lib/supabase/client.ts` — `createClient` with the publishable key (env: `NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_ANON_KEY`).
- `components/CustomerMenu.tsx` — guest view: category browsing, cart, order placement by `?table=<id>`.
- `components/OwnerCabinet.tsx` — owner view: dish/category/table management, order status flow, per-table QR display/download (PNG served from the `qr-codes` bucket).
- `components/AppHeader.tsx` — sticky top bar shared by all routes: logo (→ `/admin`), language switcher; owner-only view switcher + kebab menu.
- `components/ViewSwitcher.tsx` — owner-only collapsed circle toggling guest (`/`) vs admin (`/admin`).
- `components/MoreMenu.tsx` — owner kebab menu: sound toggle, admin profile (`/admin/profile`), sign out.
- `components/LanguageSwitcher.tsx` — ua/en/hu toggle.
- `components/AdminProfile.tsx` — account email + change-password form (gated by `isOwner`).
- `components/AppFooter.tsx` — shared footer.
- `hooks/use-mobile.ts` — `useIsMobile()` (768px breakpoint).
- `lib/utils.ts` — `cn()` (clsx + tailwind-merge).
- `e2e/` — Playwright: `guest-flow.spec.ts` (menu → cart → order, `?table=3`, search), `supabase-mock.mjs` (PostgREST-style fake server with CORS + `__state` inspection endpoints), `fixtures.mjs` (seed-shaped rows). Config in `playwright.config.ts` (mock on :54321, app on :3100).

## Conventions
- All pages/components are `'use client'` — it is a pure SPA; do not introduce server components, route handlers, or API routes.
- **Localization**: every user-visible string goes through `t('key')` from `useQRMenu()`. Add keys to `TRANSLATIONS` in `lib/store.tsx` — each entry needs `ua` and `en` (plus `hu` where sensible). Never hardcode UI text.
- **Data model**: trilingual fields (`nameUa/nameEn/nameHu`, `descriptionUa/…`, `ingredientsUa/…`); row ids are UUIDs generated client-side (`crypto.randomUUID()`).
- **Persistence**: data in Supabase (RLS: anon reads menu + creates orders; owner manages). Language only in `localStorage` (`qr_menu_lang`). Do not reintroduce localStorage for menu/orders/tables.
- **Owner auth**: Supabase email+password; owner cabinet is gated by `isOwner`. No hardcoded passwords.
- UI: Tailwind utility classes inline; stone/amber palette; `motion` + `AnimatePresence` for transitions.
- **Git workflow**: commit with a descriptive message after each change; do **not** push to GitHub after every commit — push only when the user asks or when releasing to production (merge `main` → `production` + deploy hook `?buildCache=false`).
- Dish/category images: Unsplash presets are remote URLs; the owner may upload custom photos to the `dish-images` bucket instead. Keep presets remote; don't vendor image files.

## Notes
- Template leftovers removed during cleanup (README, layout metadata, package name, unused dependency, `metadata.json`, `bun.lock`, unused env vars).
- Supabase access model: `anon` = guests (read menu, insert orders only — least privilege, TRUNCATE revoked), `authenticated` = single cafe owner (full control). Realtime published for `orders`.
- Storage: buckets `dish-images` (dish photos) and `qr-codes` (table QR PNGs) — both public (CDN serves by URL), writes owner-only, **no** public SELECT/listing policies. QR path is stored in `tables.qr_path`; deleting a table also removes its file.
- Owner preferences (sound toggle) persist in the `settings` table (key `owner`).
- Owner account: `etvesh.p@gmail.com` created via Supabase Auth (email pre-confirmed; temp password was handed out — change it).
