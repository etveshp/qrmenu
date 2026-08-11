# QR Menu for Cafe — AGENTS.md

Client-side QR-menu web app for cafés: guest menu view, owner cabinet (dish/category CRUD, orders, table QR codes), trilingual (uk/en/hu). Next.js 16.3 App Router + React 19.2 + Tailwind CSS 4, **no backend** — all state persists in `localStorage`.

## Project
- Stack: Next.js 16.3 (`app/` router, all client components, Turbopack bundler), React 19.2, Tailwind CSS 4 (`@tailwindcss/postcss`), `motion` (framer-motion), `lucide-react`, `qrcode`, TypeScript 5.
- Entry point: `app/page.tsx` — wraps the app in `QRMenuProvider` and toggles between `CustomerMenu` (guest) and `OwnerCabinet` (owner) views.
- Package manager: `npm` (package-lock.json).
- Tests: Vitest + React Testing Library (jsdom), config `vitest.config.mts`; store tests in `lib/store.test.tsx`.
- Git repo initialized (`git init`); no commits yet.

## Commands
- `npm install` — install deps
- `npm run dev` — dev server
- `npm run build` — production build (Turbopack; TS errors fail the build; ESLint is not run during builds since Next 16 dropped the `eslint` config key)
- `npm run start` — serve production build
- `npm run lint` — ESLint (flat config, `eslint.config.mjs`; `next lint` no longer exists in Next 16)
- `npm test` — Vitest (single run); `npm run test:watch` — watch mode

## Architecture
- `lib/store.tsx` — single source of truth. Types (`MenuItem`, `Category`, `Order`, `OrderItem`), `QRMenuProvider` context, CRUD for items/categories/orders/tables, translations (`TRANSLATIONS` map), localStorage persistence + cross-tab sync via `storage` events.
- `components/CustomerMenu.tsx` — guest view: category browsing, cart, order placement by `?table=<id>`.
- `components/OwnerCabinet.tsx` — owner view: dish/category/table management, order status flow, per-table QR-code download (`qrcode` pkg).
- `components/LanguageSwitcher.tsx` — ua/en/hu toggle.
- `hooks/use-mobile.ts` — `useIsMobile()` (768px breakpoint).
- `lib/utils.ts` — `cn()` (clsx + tailwind-merge).

## Conventions
- All pages/components are `'use client'` — it is a pure SPA; do not introduce server components, route handlers, or API routes.
- **Localization**: every user-visible string goes through `t('key')` from `useQRMenu()`. Add keys to `TRANSLATIONS` in `lib/store.tsx` — each entry needs `ua` and `en` (plus `hu` where sensible). Never hardcode UI text.
- **Data model**: trilingual fields (`nameUa/nameEn/nameHu`, `descriptionUa/…`, `ingredientsUa/…`); ids prefixed `dish-`/`cat-`/`order-` + `Date.now()`.
- **Persistence keys**: `qr_menu_items`, `qr_menu_categories`, `qr_menu_orders`, `qr_menu_tables`, `qr_menu_lang` — do not rename without a migration.
- UI: Tailwind utility classes inline; stone/amber palette; `motion` + `AnimatePresence` for transitions.
- Dish/category images are remote URLs (unsplash) — keep them remote; don't add local image upload.

## Notes
- Template leftovers removed during cleanup (README, layout metadata, package name, unused dependency, `metadata.json`, legacy `.eslintrc.json`, `bun.lock`, unused env vars).
