# QR Menu for Cafe

Мобільний веб-застосунок QR-меню для кафе: гості сканують QR-код на столі, переглядають тримовне меню та надсилають замовлення на кухню; власник керує меню, замовленнями, столиками та QR-кодами через особистий кабінет. Інтерфейс тримовний (укр / англ / угор).

## Можливості

- **Гостьове меню**: категорії з фото, пошук за назвою/інгредієнтами, кошик із замовленням, коментар, прив'язка замовлення до столика через `?table=<id>`.
- **Кабінет власника**: вхід за email + паролем (Supabase Auth), замовлення в реальному часі (статуси з валідацією переходів, звукове сповіщення), керування стравами та категоріями (власне фото — завантаження у Storage або пресети), генерація та завантаження QR-кодів для столиків.
- **Локалізація**: повний словник `uk / en / hu`.

## Стек

- **Next.js 16** (App Router, Turbopack) + **React 19** — увесь UI — клієнтські компоненти (SPA)
- **TypeScript 5** (strict)
- **Tailwind CSS 4** (+ `@tailwindcss/postcss`)
- `motion` (анімації), `lucide-react` (іконки), `qrcode` (генерація QR)
- **Supabase**: Postgres + Auth + Storage + Realtime (RLS); `localStorage` — лише мова інтерфейсу

## Роути

| Шлях | Призначення |
|------|-------------|
| `/` | Гостьове меню (`CustomerMenu`) |
| `/admin` | Кабінет власника (`OwnerCabinet`; форма входу, коли сесії немає) |
| `/admin/profile` | Профіль власника + зміна пароля (`AdminProfile`) |

## Команди

| Команда | Опис |
|---------|------|
| `npm install` | Встановити залежності |
| `npm run dev` | Dev-сервер (http://localhost:3000) |
| `npm run build` | Продакшен-збірка (Turbopack; `prebuild` запускає ESLint, помилки TS валять збірку) |
| `npm run start` | Запуск продакшен-збірки |
| `npm run lint` | ESLint (flat config) |
| `npm test` | Тести Vitest (одноразово) |
| `npm run test:watch` | Тести у watch-режимі |
| `npm run clean` | Очистити збірку (`next clean`) |

## Тести

Vitest + React Testing Library (jsdom). **35 тестів** у 4 файлах: `lib/store.test.tsx` (стор: CRUD, ціни, статуси, переклади) + компонентні (`AdminProfile`, `CustomerMenu`, `OwnerCabinet`) зі спільним in-memory фейком Supabase (`lib/__fixtures__/supabase-fake.ts`).

## Структура

```
app/            — layout, роути /, /admin, /admin/profile, 404
components/     — CustomerMenu, OwnerCabinet, AdminProfile, AppHeader/AppFooter, LanguageSwitcher, ViewSwitcher, MoreMenu
lib/            — store.tsx (контекст: дані, CRUD, переклади, Supabase), supabase/client.ts, utils.ts, __fixtures__/
hooks/          — useIsMobile()
supabase/       — migrations/ (схема + RLS), seed.sql
```

## Налаштування

- Env-змінні: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` — див. `.env.example`.
- Схема/RLS: міграції в `supabase/migrations/` (застосовуються на віддалений проєкт через MCP `apply_migration`); стартові дані — `supabase/seed.sql`.
- Доступ: `anon` = гості (читання меню, створення замовлень — найменші привілеї), `authenticated` = власник (повне керування).

## Статус

Проєкт розгорнуто на Vercel (`https://qrmenu-omega-azure.vercel.app`). Дорожня карта, зафіксовані рішення та черга — у [`PLAN.md`](PLAN.md).
