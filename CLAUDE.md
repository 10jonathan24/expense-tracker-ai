# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # start dev server at http://localhost:3000
npm run build        # production build
npm run start        # serve the production build
npm run lint         # next lint (eslint-config-next)
npx tsc --noEmit     # type-check (no separate typecheck script defined)
```

There is no test suite in this repo yet.

Install note: `npm install` may fail in sandboxed environments with `EALLOWSCRIPTS`. Use `npm install --ignore-scripts` in that case (safe here — no dependency relies on install-time build scripts).

## Architecture

This is a single-page Next.js 14 App Router app (`src/app/page.tsx`) — there is no routing beyond the one page. All state lives client-side; there is no backend/API.

**Data flow**: `src/hooks/useExpenses.ts` is the single source of truth for expense data. It loads from `localStorage` on mount (`src/lib/storage.ts`), seeds demo data on first-ever load only (`src/lib/seed.ts`, gated by an `expense-tracker:seeded` flag so deleting all expenses doesn't re-seed), and persists back to `localStorage` on every change via `useEffect`. `page.tsx` owns UI state (active modal, filters, toasts) and derives `filteredExpenses` with a `useMemo` over search/category/date-range/sort — components below it are presentational and receive data + callbacks as props rather than touching storage directly.

**Categories are a closed set**: `CATEGORIES`/`Category` in `src/types/expense.ts` is the single definition of the six categories, paired with `CATEGORY_STYLES` (badge/dot/chart colors per category). Any new category-aware UI should read from these rather than hardcoding category names or colors.

**Component responsibilities** (`src/components/`):
- `ExpenseForm` — add/edit form with inline validation (shared by both flows via an `initial?: Expense` prop).
- `ExpenseFilters` — controlled filter bar; `FilterState`/`DEFAULT_FILTERS` are exported and owned by `page.tsx`.
- `ExpenseList` — pure display + edit/delete triggers; distinguishes "no expenses at all" from "no expenses match filters".
- `SummaryCards` / `SpendingCharts` — always computed from the full unfiltered `expenses` array (dashboard overview), not from `filteredExpenses` (which only affects the list below and the header's Export CSV button; the separate Export Data button always exports all expenses as Date, Category, Amount, Description).
- `Modal` / `ConfirmDialog` / `Toast` — generic UI primitives with no expense-specific logic.

**Formatting/utilities** (`src/lib/`): `format.ts` (currency + date formatting, `todayISO()`), `csv.ts` (CSV export + browser download trigger), `storage.ts`, `seed.ts`.

**Styling**: Tailwind only, no component library. Custom `fade-in`/`zoom-in`/`slide-up` keyframes are defined in `tailwind.config.ts` (the `tailwindcss-animate` plugin is not installed — don't use `animate-in`/`slide-in-from-*` utility classes, they won't exist). Design intent is a light, professional slate/indigo theme; `globals.css` does not implement dark mode.

## Known constraint

Pinned to `next@14.2.35` (latest stable 14.x — 14.3 only exists as canary) per the original tech requirement. `npm audit` reports high/critical advisories against this Next.js line; most concern Server Actions, Middleware, and the Image Optimization API, none of which this app uses (no API routes, no `next/image`, no middleware, no custom server). Moving off Next 14 to clear them is a version-bump decision for whoever owns this repo, not something to do incidentally.
