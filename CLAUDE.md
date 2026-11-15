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
- `ExpenseFilters` — controlled filter bar; `FilterState`/`DEFAULT_FILTERS` are exported and owned by `page.tsx`. Includes "Quick range" date presets (All time / This month / Last 30 days / Last 90 days) built from `shiftIsoDate`/`startOfMonthIso` in `lib/format.ts`, so the From/To date inputs aren't the only way to set a range.
- `ExpenseList` — pure display + edit/delete triggers; distinguishes "no expenses at all" from "no expenses match filters".
- `SummaryCards` / `SpendingCharts` — always computed from the full unfiltered `expenses` array (dashboard overview), not from `filteredExpenses` (which only affects the list below).
- `Modal` / `ConfirmDialog` / `Toast` — generic UI primitives with no expense-specific logic.
- `ExportDrawer` — the header's "Export" button opens this right-side drawer (not the shared `Modal`, which is sized for compact dialogs). It owns its own date-range/category filters, independent of `page.tsx`'s main list filters, and lets the user pick a format (CSV/JSON/PDF), preview a sample of the matched rows, name the file, and export. All the actual filtering/building/downloading logic lives in `src/lib/exportData.ts`, which the drawer calls into; the drawer itself is presentational state + the form controls.

**Export** (`src/lib/exportData.ts`): `filterExpensesForExport` applies the drawer's own date-range/category filters (distinct from the main list's `FilterState`). `buildCsv`/`buildJson` are synchronous string builders; `buildPdf` dynamically imports `jspdf` + `jspdf-autotable` (so that ~450KB engine isn't in the initial bundle) and renders a formatted report via `autoTable`. `exportExpenses(format, expenses, filters, filenameBase, allCategories)` is the orchestrating entry point — filters, throws `EmptyExportError` if nothing matches, builds the chosen format, and triggers the browser download via `downloadBlob`. `sanitizeFilename` strips characters that are awkward in downloaded filenames.

**Formatting/utilities** (`src/lib/`): `format.ts` (currency + date formatting, `todayISO()`, and the `shiftIsoDate`/`startOfMonthIso` date-range helpers shared by `ExpenseFilters`'s and `ExportDrawer`'s quick-range presets), `exportData.ts` (see above), `storage.ts`, `seed.ts`.

**Styling**: Tailwind only, no component library. Custom `fade-in`/`zoom-in`/`slide-up`/`slide-in-right` keyframes are defined in `tailwind.config.ts` (the `tailwindcss-animate` plugin is not installed — don't use `animate-in`/`slide-in-from-*` utility classes, they won't exist). Design intent is a light, professional slate/indigo theme; `globals.css` does not implement dark mode.

**PDF generation**: `jspdf` + `jspdf-autotable` are client-side-only dependencies (no server/API route involved) used solely by `buildPdf` in `src/lib/exportData.ts`. Import them with the named `jsPDF`/`autoTable` exports (`import { jsPDF } from "jspdf"`), not the default export — both builds expose it, but Node's own module resolution (e.g. for a standalone script) picks a differently-shaped bundle than a browser bundler does, and the named export is correct in both.

## Known constraint

Pinned to `next@14.2.35` (latest stable 14.x — 14.3 only exists as canary) per the original tech requirement. `npm audit` reports high/critical advisories against this Next.js line; most concern Server Actions, Middleware, and the Image Optimization API, none of which this app uses (no API routes, no `next/image`, no middleware, no custom server). Moving off Next 14 to clear them is a version-bump decision for whoever owns this repo, not something to do incidentally.
